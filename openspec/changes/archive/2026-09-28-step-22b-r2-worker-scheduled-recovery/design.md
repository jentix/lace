## Context

Session 22A delivered `D1ContentRepository`, which implements every content,
media, outbox-lease, and site-build port with guarded `batch()` calls. What
Cloudflare still lacks is everything around it: object storage, image
verification, security state, Better Auth, the Worker composition root, and a
way to dispatch outbox work once the request that created it has ended.

Node's composition (`packages/platform-node/src/runtime.ts`) is the reference:
it builds `ContentUseCases`, `MediaUseCases`, `SiteBuildUseCases`, the security
service, the rate limiter, and the Better Auth boundary, then calls
`createLaceApp`. Its dispatchers (`NodeSiteBuildDispatcher`,
`NodeMediaDeletionDispatcher`) depend only on application ports, plus one
`setInterval(...).unref()` used to renew a build lease.

Constraints that shape the approach:

- Worker isolates have no startup phase and no persistent timers. Bindings
  arrive per request as `env`.
- D1 counts every statement, including each statement in a batch, toward a
  50-query-per-invocation free-plan budget, and `waitUntil` work shares its
  request's budget.
- R2's `put()` needs a known length for streamed bodies. R2 bindings take no
  abort signal.
- `sharp` is native and cannot run in workerd.
- `lace.config.ts` ends in `export default await defineConfig(...)`, which uses
  Web Crypto. A spike showed that top-level await with `crypto.subtle.digest`,
  Better Auth, and `drizzle-orm/d1` all start under workerd with `nodejs_compat`
  when bundled by Wrangler 4.129.

## Goals / Non-Goals

**Goals:**
- Parity with Node for every portable API behavior on Cloudflare bindings.
- One dispatcher implementation shared by both runtimes.
- Verifiable locally: Miniflare D1/R2/KV bindings for adapter and composition
  tests, plus a Wrangler dry-run bundle check.

**Non-Goals:**
- Deploy-hook trigger, `dev:cloudflare`, remote migrations, and smoke tests
  (22C).
- Pruning expired idempotency and rate-limit rows. Node does not implement it
  either, and adding it on one runtime would break parity.
- A KV-backed read path. The cache port has no consumer yet.

## Decisions

### D1. Package placement and entry

Adapters and `createCloudflareWorker({ config })` live in
`@lacecms/platform-cloudflare`, which the architecture allows to depend on
application, server, db, auth, and config. `apps/api/worker/index.ts` is a
three-line entry that statically imports `../../../lace.config.ts` and exports
the handler. `apps/api/wrangler.jsonc` sits next to it. The entry has its own
`tsconfig.json`, which extends the Worker lib and sets
`allowImportingTsExtensions`. That keeps it out of the Node `src/` build, whose
`rootDir` excludes the root config. A root script type-checks it.

*Alternative:* a separate `apps/worker` package. Rejected because
`check-boundaries` already names `@lacecms/app-api` as the deployable composition
root that may import both platform packages.

### D2. Runtime-neutral dispatchers in `@lacecms/application`

`SiteBuildDispatcher` and `MediaDeletionDispatcher` move to
`packages/application/src/dispatchers.ts` unchanged. The only runtime-specific
call was `unref()`, which becomes an optional call on the timer handle, reached
through a typed `globalThis` view because the application package has no timer
lib types. `@lacecms/platform-node` re-exports them as
`NodeSiteBuildDispatcher` / `NodeMediaDeletionDispatcher` with the old option
type names, so existing tests and apps stay untouched.

*Alternative:* copy the dispatchers into the Cloudflare package. Rejected
because two copies of the retry and lease logic would drift apart.

### D3. R2 adapter

`CloudflareR2ObjectStorage` depends on a structural `R2Bucket` subset
(`put`, `get`, `delete`, `head`). `put` collects the body up to
`MAX_MEDIA_BYTES`, exactly as MinIO does, then writes a `Uint8Array` with
`httpMetadata.contentType`. The size check rejects before the write. `get`
returns `null` for a missing object and otherwise adapts `ReadableStream` to the
portable async iterable through a reader loop, which avoids depending on stream
async-iteration support. Each call races a timer (default 10 s, configurable
through `LACE_R2_TIMEOUT_MS`, 1–60 000 ms). Any error or timeout becomes
`CloudflareObjectStorageError` with a fixed message. `createReadUrl` matches the
MinIO shape. Because a Worker has no startup phase, the Worker skips a bucket
reachability check. Readiness stays D1 `select 1`, as in Node, which checks only
SQLite.

### D4. Structural image inspector

`WorkerImageInspector` parses containers without decoding pixels. Sharp's
`metadata()` also reads headers only, so the verification strength is
comparable:

- **PNG:** signature, then a walk over every chunk with CRC-32 verification.
  `IHDR` must be the first chunk. `IEND` must end the file exactly. Orientation
  comes from an `eXIf` chunk.
- **JPEG:** a marker walk from SOI through the entropy-coded data to EOI, with
  no bytes after EOI. The frame header supplies dimensions. APP1 Exif
  orientation is parsed in either byte order.
- **WebP:** the RIFF size must equal the file length minus 8. Chunks are walked
  with padding. Dimensions come from `VP8 `, `VP8L`, or `VP8X` (canvas).
  Orientation comes from an `EXIF` chunk when present.
- **AVIF:** top-level ISOBMFF boxes must tile the file exactly, with an
  `ftyp` brand of `avif`/`avis`. `meta` is required. The primary item's `ispe`
  is resolved through `pitm`/`ipma`/`ipco`, and an `irot` of 1 or 3 swaps the
  axes.

EXIF orientations 5–8 swap width and height, the same as sharp `autoOrient`.
Every failure throws `DomainError("CONTENT_INVALID_STATE", "Media image data is
invalid.")`. Tests generate their fixtures with sharp (a dev dependency only)
and compare the results against `NodeSharpImageInspector`.

*Alternative:* the Cloudflare Images binding. Rejected because it adds a paid
service dependency and cannot run in Miniflare-only tests.

### D5. D1 security service and rate limiter

`D1SecurityService` mirrors `NodeSecurityService` and uses Web Crypto:
`crypto.getRandomValues` for 32-byte base64url secrets, `crypto.subtle.digest`
for SHA-256 hex, and a constant-time hex comparison that visits every
non-revoked row. Passwords use `hashPassword` from `better-auth/crypto`, which
is portable. Each mutation applies its guard inside a statement:

- **Mint:** one batch runs `insert or ignore installation_state`, then
  `insert into setup_tokens select … where not exists(completed)`. Zero changes
  on the second statement means "Setup already completed."
- **Claim:** one conditional `update … where token_hash = ? and consumed_at is
  null and expires_at > ? and (claimed_email_hash is null or = ?) and not
  exists(completed)`. A follow-up read tells a matching claim apart from a
  refusal. The update only sets the claim when it is still null.
- **User creation:** one batch inserts `user` and `account`. A unique-email race
  re-reads the user.
- **Completion:** one batch. The first statement is
  `update installation_state … where setup_completed_at is null`. The second
  consumes all tokens `where exists(installation_state with this admin id and
  completed_at = now)`. Zero changes on the first statement means "Setup
  unavailable."
- **Role and disable:** one `update` whose `where` clause allows the change
  unless it deactivates an active admin while
  `(select count(*) … active admins) <= 1`. SQLite runs single statements
  atomically, so concurrent requests serialize. Zero changes plus an existing
  row means `LAST_ADMIN_PROTECTED`.
- **Rate limiter:** a single statement,
  `insert … on conflict do update set request_count = case when
  window_started_at = excluded.window_started_at then request_count + 1 else 1
  end … returning request_count`. Node's read-then-write is not atomic across
  processes. D1 is stricter, and the observable limits are the same.

A new `securityContractCases` suite in `@lacecms/test-utils` holds the
bootstrap, final-admin, token, and limiter behavior. It runs against Node SQLite
and local D1.

### D6. Better Auth on D1

The existing `createBetterAuthBoundary` accepts any Drizzle database, and the
Worker passes `drizzle(env.DB)` from `drizzle-orm/d1` with `betterAuthSchema`.
`production` is true unless `LACE_ENVIRONMENT=development`, so cookies are
secure by default. `wrangler.jsonc` sets `compatibility_flags:
["nodejs_compat"]`, and a test asserts the flag is present.

### D7. Settings, per-isolate runtime, and failure mode

`parseCloudflareSettings(env)` reports issues by name only, following Node's
error shape. The composed runtime is memoized in a `WeakMap` keyed by the `env`
object, so each isolate builds it once and a changed `env` rebuilds it. When
parsing fails, `fetch` logs the variable names and returns `503` with the
existing sanitized `INTERNAL_ERROR` envelope ("An unexpected error occurred."),
because the contracts define no dedicated unavailability code and adding one
would change the REST contract. `scheduled` logs the same names and returns.

### D8. Admin assets through the ASSETS binding

`wrangler.jsonc` points `assets.directory` at `../admin/dist` with
`run_worker_first: true`, `html_handling: "none"`, and
`not_found_handling: "none"`. Every request therefore reaches the Worker, and
the existing `createLaceApp` order (API routes → `/api/auth/*` → health →
`notFound` delegating non-`/api` paths to `adminAssets`) is preserved. The
responder mirrors Node's `createNodeAdminAssets`:

- `/admin` → 308 to `/admin/`.
- `/admin/<suffix>` → `ASSETS.fetch("/<suffix>")`.
- An extensionless path → `/index.html`.
- A 404 → 404.
- A method other than GET/HEAD → 405.
- Responses get `x-content-type-options: nosniff`.

The responder is left out when the binding is absent.

### D9. Scheduled recovery and `waitUntil`

`scheduled` runs `SiteBuildDispatcher.runOnce(1)` and then
`MediaDeletionDispatcher.runOnce(5)`, each in its own try/catch. At most one
site-build event can be pending, and the limit of 5 keeps the invocation under
50 queries. A test measures queries with `countingD1`.

On `fetch`, after a 2xx response to publish, entry DELETE, media DELETE,
`retry-deletion`, `builds`, or `builds/:id/retry`, the Worker calls
`ctx.waitUntil(pass)`. The pass runs media dispatch immediately, then waits
`SITE_BUILD_DEBOUNCE_MS + 250 ms` and runs one build dispatch. Failures are
caught and logged. The cron runs every minute (`* * * * *`) and remains the
recovery path.

*Alternative:* Queues or Durable Object alarms. Rejected because they are new
paid primitives, and the architecture specifies a scheduled Worker.

### D10. Cache, IDs, and client IP

`CloudflareKvCache` is used only when the `CACHE` binding exists. It stores JSON
and turns every failure into a miss or no-op. Otherwise the Worker uses
`NoopCloudflareCache`. IDs use `ulid`, which is pure JS and keeps parity with
Node's ordering. The rate-limit subject is `cf-connecting-ip`, falling back to
`unknown-client`.

### D11. Bundle check

A test in `apps/api` runs `wrangler deploy --dry-run --outdir <tmp>`. It asserts
that `nodejs_compat` is present and that the bundle contains none of
`better-sqlite3`, `@aws-sdk`, `sharp`, or `node:fs`. It then loads the bundle in
Miniflare with D1/R2 bindings and nodejs_compat and checks that
`/health/live`, `/health/ready`, and a `/api/auth/*` route respond. That proves
the flag and top-level config await work under workerd.

## Risks / Trade-offs

- [Structural image parsing is less battle-tested than libvips] → Fixtures are
  generated by sharp and compared against it, and malformed and trailing-data
  cases are covered. The use case still enforces dimension limits.
- [`waitUntil` shares the request's 50-query budget] → The pass is best-effort
  and swallows errors. Claims whose processing fails stay leased for 60 s and
  are then recovered by cron.
- [Up to a minute of build latency when `waitUntil` misses] → This is an
  accepted trade-off. The admin UI already shows "build pending".
- [The Wrangler dry-run test is slow (~5–10 s)] → It is confined to one
  `apps/api` test with an extended timeout.
- [`scheduled` holds a lease across a slow deploy-hook call] → The dispatcher
  still renews the lease through `setInterval`, which Workers allow during an
  invocation.

## Migration Plan

No schema migration. The Node runtime keeps its exported names. The Worker is
not deployed until Session 22C adds migrations and the deploy hook.
