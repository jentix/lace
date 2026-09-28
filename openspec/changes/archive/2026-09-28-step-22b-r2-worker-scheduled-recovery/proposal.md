## Why

Roadmap Step 22 ("Cloudflare runtime"), Session 22B — R2, Worker, and
scheduled recovery. Session 22A made D1 a contract-equivalent content store, but
Cloudflare still cannot serve a single request: there is no native R2 media
storage, no Worker composition root that binds D1/R2/KV/secrets to the portable
Hono application, no Better Auth or security-state persistence on D1, and no
recovery path for outbox events once a Worker invocation ends. Architecture §§5,
9.7–9.8, 10, 14, and 15 require the same behavior on Cloudflare as on Node, with
a scheduled recovery process rather than in-process timers.

## What Changes

- Add a native R2 object-storage adapter (no AWS SDK) with the same opaque-key,
  bounded-size, missing-versus-empty, sanitized-failure, and public read-URL
  semantics as the MinIO adapter.
- Add a runtime-neutral image inspector for the Worker that verifies JPEG, PNG,
  WebP, and AVIF container structure, rejects malformed or trailing data, and
  reports orientation-applied dimensions without a native image library.
- Add D1 security persistence: setup tokens and first-admin bootstrap, user
  management with final-administrator protection, build tokens, and HMAC
  fixed-window rate-limit buckets, using single guarded statements or one atomic
  `batch()` per mutation and Web Crypto for digests, HMAC, and randomness.
- Run Better Auth on D1 through the existing auth boundary and Drizzle's D1
  driver; the Worker configuration enables `nodejs_compat`, the compatibility
  flag Better Auth requires for `AsyncLocalStorage`.
- Add a Cloudflare composition root in `@lacecms/platform-cloudflare` that parses
  Worker bindings and secrets once per isolate (D1, R2, optional KV cache with a
  no-op default, optional static-assets binding, auth secret, public base URL,
  optional deploy-hook secret), never discloses supplied values, and builds the
  same `createLaceApp` composition as Node.
- Serve built admin assets under `/admin` from the Workers static-assets binding
  with SPA fallback, behind the existing API → auth → health → admin routing
  order.
- Move the site-build and media-deletion dispatchers from `@lacecms/platform-node`
  into `@lacecms/application` as runtime-neutral classes (Node keeps its
  exported names) so both runtimes use one retry and lease implementation.
- Add a `scheduled` handler (cron every minute) that runs bounded site-build and
  media-deletion recovery within the D1 per-invocation query budget; successful
  publication, deletion, and build requests also schedule a best-effort
  `waitUntil` dispatch that is never the only recovery path.
- Add the Worker entry (`apps/api/worker/index.ts`) that statically imports the
  project-owned `lace.config.ts`, and `apps/api/wrangler.jsonc` declaring the
  bindings, compatibility flag, assets directory, and cron trigger; add a bundle
  check proving the Worker bundle contains no Node SQLite, S3, sharp, filesystem,
  or secret material.
- Non-goals (Session 22C): `pnpm dev:cloudflare`, the deploy-hook
  `SiteBuildTrigger` adapter (until then the Worker composes the existing
  "trigger unavailable" behavior), D1 migration commands, and end-to-end
  Cloudflare smoke tests. Expired idempotency/rate-limit row pruning remains
  unimplemented in both runtimes and is not introduced here.

## Capabilities

### New Capabilities
- `cloudflare-media-storage`: native R2 object storage and runtime-neutral image
  inspection with the same media semantics as Node/MinIO.
- `d1-security-persistence`: D1 persistence of setup, bootstrap, users, build
  tokens, and rate-limit buckets with guarded atomic statements.
- `cloudflare-worker-composition`: Worker bindings/secrets parsing, Better Auth
  on D1, static admin assets, routing order, optional KV cache, and bundle
  portability.
- `cloudflare-scheduled-dispatch`: scheduled outbox recovery with event leasing
  and best-effort post-commit `waitUntil` dispatch within D1 query budgets.

### Modified Capabilities
None. Existing outbox, site-build, security, and authentication requirements
apply unchanged to the new runtime; the dispatcher extraction preserves Node
behavior.

## Impact

- `@lacecms/platform-cloudflare`: new R2 storage, image inspector, KV/no-op
  cache, D1 security service and rate limiter, settings parser, admin-assets
  responder, Worker composition, and scheduled/`waitUntil` dispatch; new
  dependencies on `@lacecms/auth`, `@lacecms/server`, `@lacecms/config`,
  `better-auth`, `drizzle-orm`, and `ulid` (all runtime-portable).
- `@lacecms/application`: gains runtime-neutral `SiteBuildDispatcher` and
  `MediaDeletionDispatcher`; `@lacecms/platform-node` re-exports them under its
  existing names with unchanged behavior.
- `@lacecms/test-utils`: new security contract suite run against Node SQLite and
  local D1.
- `apps/api`: new Worker entry, `wrangler.jsonc`, worker typecheck, and
  `wrangler` dev dependency; Node entry points unchanged.
- No database migration, REST contract, or admin UI change.
