# Lace MVP Implementation Roadmap

## 1. Purpose and source of truth

This document turns [`mvp-architecture.md`](./mvp-architecture.md) into an
implementation sequence. The architecture document owns product scope,
invariants, and technology decisions. This roadmap owns dependency order,
deliverables, acceptance criteria, and recommended session boundaries.

If implementation uncovers a conflict, change the architecture document first
and record a short ADR under `docs/adr/`; do not silently implement a different
design.

## 2. How to use the roadmap

A **session unit** is one cohesive change set that can be implemented, reviewed,
and verified without relying on uncommitted placeholder behavior. It is not a
time estimate. A session ends only when its listed checks pass or a concrete
external blocker is documented.

Size labels:

- **S — one session:** implement the whole step in one session.
- **M — two sessions:** use the stated `A` and `B` boundaries.
- **L — three or more sessions:** each named session is independently testable.

Every session follows the same completion rules:

1. Production code contains no untracked `TODO` standing in for required
   behavior. Deferred behavior is an explicit issue or roadmap item.
2. New public APIs have runtime validation, TypeScript types, and negative tests.
3. Database behavior has migration coverage and foreign-key enforcement.
4. The narrowest relevant tests, then root `typecheck` and `lint`, pass.
5. User-visible or operational behavior is documented in the same change.
6. No dependency-direction rule from the architecture is violated.

## 3. OpenSpec delivery workflow

OpenSpec is mandatory for roadmap implementation after this bootstrap planning
update. Changes are created just in time; do not pre-create all roadmap changes.

### Change granularity and naming

- One recommended session unit maps to one OpenSpec change by default.
- Use kebab-case names prefixed by the roadmap unit, for example
  `m00-baseline-adrs`, `m02a-field-descriptors`, or
  `m14b-cloudflare-worker-r2`.
- A change may cover two neighboring units only when the proposal explains why
  they cannot be reviewed or verified independently and the user approves the
  combined scope.
- A change may contain delta specs for multiple capabilities when the session
  unit genuinely crosses them; do not create artificial one-file-per-package
  capabilities.
- `skip_specs` is allowed only for a purely mechanical/tooling change with no
  observable capability requirement, and its proposal must justify the skip.

### Required lifecycle for every unit

1. **Propose.** Use the repository's `openspec-propose` skill. It creates the
   complete artifact set required by the configured schema: proposal, delta
   specs, design when applicable, and tasks. The proposal cites the roadmap unit
   and relevant architecture sections, states scope and non-goals, and identifies
   affected capability specs. This action is planning-only and ends without code
   changes.
2. **Review.** The user reviews the artifacts. Material ambiguity is resolved in
   the artifacts before apply. An existing proposal is revised through
   `openspec-update-change`, not by silently changing implementation intent.
3. **Apply.** After an explicit user request, use `openspec-apply-change`. Read all
   context files returned by the CLI, implement pending tasks in order, verify
   each task, and mark its checkbox only after its specified behavior is complete.
4. **Reconcile.** If implementation exposes a design or scope problem, stop the
   apply workflow. Update the OpenSpec artifacts—and architecture/roadmap first if
   their invariants change—then resume only after review.
5. **Validate.** Before completion, run
   `openspec validate <change-name> --type change --strict` plus the tests and
   quality commands required by the unit. An OpenSpec task is not complete when
   behavior or verification is deferred.
6. **Archive.** After an explicit user request, use `openspec-archive-change`.
   Synchronize delta specs into `openspec/specs/**` unless the reviewed change
   intentionally has no specs, verify the sync, and archive the completed change.

Proposal, apply, and archive are separate agent turns, although they may remain
in the same Codex task. The session units below count implementation/apply units;
the planning and archive turns are workflow gates, not additional implementation
units.

### CI and source-of-truth rules

- CI runs `openspec validate --all --strict` and rejects invalid active or main
  specs.
- Accepted main specs refine the architecture but never override it silently.
- Active change artifacts describe proposed behavior and are not accepted product
  truth until synchronized during archive.
- Tasks must link behavior, implementation, tests, and documentation closely
  enough that completion can be verified without interpreting intent from chat.
- Agents do not implement roadmap work that has no active, apply-ready OpenSpec
  change.

## 4. Fixed implementation conventions

These conventions remove choices that would otherwise make two implementations
incompatible:

- TypeScript uses strict mode, ESM, explicit package exports, and no default
  cross-package deep imports.
- pnpm catalogs centralize third-party versions; the lockfile is committed.
- Turborepo orchestrates `build`, `typecheck`, `lint`, and `test`.
- `@fission-ai/openspec` is pinned as a root development dependency; project
  commands use `pnpm exec openspec` rather than relying on a global install.
- Oxlint and Oxfmt are the lint/format pair. Use repository-root
  `.oxlintrc.json` and `.oxfmtrc.json`; do not add ESLint or Prettier packages,
  configs, plugins, or compatibility wrappers.
- Vitest is used for unit, contract, and API integration tests; Playwright is
  reserved for browser flows.
- IDs are ULIDs generated through the application `IdGenerator` port.
- Application time comes from a `Clock` port. SQL stores UTC Unix milliseconds;
  HTTP exposes ISO 8601 UTC strings.
- Transport handlers map domain/application errors to shared REST error codes;
  repositories never return HTTP concepts.
- SQL identifiers and migrations use snake_case; TypeScript values use
  camelCase; DTO mapping is explicit.
- Test fixtures use deterministic clocks and ID sequences.

## 5. Dependency and delivery overview

```text
foundation
  -> content/config
  -> domain/application
  -> database + Node repositories
  -> content sync
  -> REST + Node runtime
  -> auth
  -> media
  -> SDK + Astro fixture
  -> admin shell + editor
  -> local development environment
  -> local code-first configuration + sync
  -> live local Astro content
  -> complete browser-admin workflows
  -> admin redesign (design system, shell, media, editor)
  -> outbox + builder
  -> Cloudflare runtime
  -> generator + upgrade
  -> cross-runtime/security/release gate
```

| Step | Outcome | Size | Recommended session units |
| ---: | --- | :---: | --- |
| 0 | Baseline and ADRs | S | whole step |
| 1 | Workspace and CI | S | whole step |
| 2 | Field DSL and portable validation | M | 2A, 2B |
| 3 | Models, blocks, and normalized config | M | 3A, 3B |
| 4 | Domain and application core | L | 4A, 4B, 4C |
| 5 | SQLite schema and Node persistence | L | 5A, 5B, 5C |
| 6 | Configuration synchronization | M | 6A, 6B |
| 7 | REST contracts and Node API | L | 7A, 7B, 7C |
| 8 | Authentication and authorization | M | 8A, 8B |
| 9 | Media backend and MinIO | L | 9A, 9B, 9C |
| 10 | SDK and reference Astro site | M | 10A, 10B |
| 11 | Admin foundation | M | 11A, 11B |
| 12 | Draft and block editor | L | 12A, 12B, 12C |
| 12.5 | Local development environment | S | whole step |
| 13 | Local code-first configuration and sync | M | 13A, 13B |
| 14 | Live local Astro site | M | 14A, 14B |
| 15 | Complete browser-admin workflows | L | 15A, 15B, 15C |
| 16 | Admin design foundation and structure | M | 16A, 16B |
| 17 | Shell and collection lists | L | 17A, 17B, 17C |
| 18 | Media library | L | 18A, 18B, 18C |
| 19 | Block editor | L | 19A, 19B, 19C |
| 20 | Remaining screens and redesign acceptance | M | 20A, 20B |
| 21 | Outbox, builds, and VPS builder | L | 21A, 21B, 21C |
| 22 | Cloudflare runtime | L | 22A, 22B, 22C |
| 23 | CLI generator and operational commands | L | 23A, 23B, 23C |
| 24 | Upgrade safety | M | 24A, 24B |
| 25 | MVP release gate | L | 25A, 25B, 25C |

The roadmap is therefore **64 recommended session units**. Small neighboring
units can be combined after the foundation stabilizes, but units that introduce
a database migration, a runtime adapter, or a security boundary should remain
separate.

## 6. Detailed implementation steps

## Step 0 — Baseline and ADRs

**Outcome:** contributors can reproduce the chosen toolchain and understand the
few decisions whose rationale is not obvious from code.

### Substeps

1. Record the exact current stable versions of Node LTS, pnpm, TypeScript,
   Turborepo, `@fission-ai/openspec`, Oxlint, Oxfmt, Hono, Valibot, Drizzle,
   Better Auth, Astro, React, Vite, Wrangler, Vitest, and Playwright. Verify
   compatibility in a disposable smoke package before pinning them.
2. Add ADRs for:
   - package/dependency boundaries;
   - guarded D1 batches versus interactive Node transactions;
   - media-reference projection and asynchronous deletion;
   - fixed-command VPS builder security model.
3. Add `docs/compatibility.md` with the supported Node, pnpm, SQLite, Wrangler,
   and browser ranges. Treat `@lacecms/*` and `create-lace` as provisional names;
   do not publish packages in this step.
4. Add `SECURITY.md` with a private vulnerability-reporting placeholder and a
   statement that the repository is pre-release.

### Acceptance

- ADRs agree with the architecture and introduce no new product features.
- Every pinned package installs together on the selected Node version.
- The compatibility document distinguishes supported versions from versions
  merely used in CI.

**Session boundary:** S; complete as one session.

## Step 1 — Workspace, package boundaries, and CI

**Outcome:** the empty monorepo becomes a buildable skeleton whose dependency
rules are mechanically enforced.

### Substeps

1. Create root `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`,
   `pnpm-workspace.yaml` catalog entries, `turbo.json`, `.editorconfig`,
   `.gitignore`, `.oxfmtrc.json`, `.oxlintrc.json`, and strict base TypeScript
   configs for library, browser, Node, and Worker targets.
2. Scaffold every package and app named in the architecture, including
   `apps/builder`. Each package gets a private initial version, explicit
   `exports`, `types`, and scripts. Do not add implementation dependencies until
   a later step needs them.
3. Add root commands required by section 18. Commands whose feature is not built
   yet must print a clear “not implemented in milestone N” message and exit
   successfully only for non-verification developer commands; `build`,
   `typecheck`, `lint`, and `test` must genuinely execute across the workspace.
   Add `spec:validate` as
   `openspec validate --all --strict --no-interactive` through the pinned local
   CLI.
4. Configure a TypeScript source-level boundary checker to encode the
   architecture import graph. Add a fixture proving an illegal import fails.
   Dependency-cruiser is deferred until it supports the project-pinned
   TypeScript 7 baseline; the active OpenSpec change MUST record the deferral
   and its replacement check.
5. Add GitHub Actions for install with frozen lockfile, Oxfmt check, Oxlint,
   typecheck, unit tests, build, OpenSpec strict validation, and lockfile/cache
   integrity. Integration jobs are added when their runtimes exist.

### Acceptance

- A clean checkout passes `pnpm install --frozen-lockfile`, `pnpm lint`,
  `pnpm typecheck`, `pnpm test`, and `pnpm build`.
- No package relies on source files through `../../packages/...` imports.
- CI and local commands use the same scripts.

**Session boundary:** S; complete as one session.

## Step 2 — Field DSL and portable validation

**Outcome:** a field definition has one portable source that produces static
types, runtime validation, and serializable form metadata.

### Session 2A — Field descriptors

1. In `packages/content`, define a discriminated `FieldDefinition` union for
   text, textarea, rich text, number, boolean, date, datetime, select, URL, and
   media.
2. Implement `field.*` builders. Builders accept JSON-serializable options only;
   reject functions, symbols, cyclic values, duplicate select values, invalid
   defaults, and contradictory constraints at config normalization time.
3. Define common options (`label`, `description`, `required`, `defaultValue`) and
   type-specific options such as string length, numeric bounds, and select
   choices. Defaults must pass the same schema as submitted content.
4. Produce serializable form metadata without embedding Valibot schemas or
   executable callbacks.
5. Add compile-time type tests and runtime table tests for every field variant.

### Session 2B — Validators and canonical data

1. Compile each field definition to a Valibot schema and provide an exhaustive
   visitor so adding a future variant produces a TypeScript error until every
   consumer handles it.
2. Implement explicit draft and publish validators. Both reject unknown keys and
   invalid present values; draft mode permits missing required model fields,
   while publish mode enforces them.
3. Implement Tiptap JSON validation with the architecture allowlist and URL
   protocol rules. Export a safe shared document type.
4. Add canonical JSON serialization with recursively sorted object keys and
   preserved array order. Hash canonical UTF-8 bytes with a Web Crypto-compatible
   SHA-256 helper; use the same fixtures in Node and Worker-like tests.
5. Enforce the title, slug, JSON-byte, and block-count constants defined by the
   architecture.

### Acceptance

- Metadata round-trips through JSON and contains no executable values.
- Type inference matches runtime optionality/default behavior.
- Malformed rich text, unsafe links, unknown fields, and oversized JSON fail with
  stable path-aware validation issues.

**Session boundary:** M; 2A and 2B are separate sessions.

## Step 3 — Models, blocks, and normalized configuration

**Outcome:** `lace.config.ts` can describe the complete MVP content structure and
produce deterministic runtime/admin projections.

### Session 3A — Models and routes

1. In `packages/config`, implement `definePage`, `defineCollection`, and
   `defineConfig` with inferred field types and duplicate-key detection.
2. Require model `version`, validate stable keys, and implement temporary
   `renamedFrom` metadata. Validate one page path or one collection route with
   exactly one `:slug` segment.
3. Implement route normalization/resolution and reject query strings, fragments,
   dot segments, duplicate slashes, ambiguous trailing slashes, and cross-model
   fixed-path collisions detectable from configuration alone.
4. Normalize definitions into deeply readonly plain data. Generate deterministic
   structural hashes excluding display metadata and projection hashes including
   it, at both per-model and whole-config levels.

### Session 3B — Block registry and projections

1. Implement `defineBlock`, schema versions, defaults, runtime validation,
   serializable metadata, and a registry with duplicate type/version checks.
2. Implement the five built-in block definitions exactly as documented. Built-ins
   must use the public DSL rather than hidden special-case validators.
3. Validate each model's allowed block types against its registry and validate
   a complete ordered draft aggregate.
4. Produce two projections:
   - runtime projection with compiled validators;
   - JSON admin/public projection with metadata and no functions.
5. Add a root-config fixture matching the architecture example and snapshot its
   canonical serialized projection.

### Acceptance

- Equal semantic configs produce equal hashes regardless of object insertion
  order.
- A Node import and a Worker bundle import normalize to identical fixtures.
- Invalid routes, missing blocks, duplicate keys, stale version/hash combinations,
  and invalid built-in defaults fail before the server starts.

**Session boundary:** M; 3A and 3B are separate sessions.

## Step 4 — Domain and application core

**Outcome:** all CMS behavior is executable in memory without Hono, Drizzle,
Better Auth, Node, or Cloudflare imports.

### Session 4A — Domain vocabulary and rules

1. Define branded IDs/keys where useful, `ContentModelKind`, draft/published
   aggregates, blocks, media metadata, build state, `Actor`, roles, permissions,
   and stable domain error codes.
2. Implement the default role-to-permission matrix and `requirePermission`.
3. Implement page cardinality, collection slug, route resolution, sparse block
   positions, normalization, and public-path conflict rules.
4. Define lifecycle invariants: one draft, zero/one published snapshot, immutable
   published data, and revision increment on every complete draft mutation.

### Session 4B — Ports and commands

1. Define focused read ports and specialized atomic mutation ports. Do not expose
   a generic cross-runtime transaction callback.
2. Required operations include model sync inspection/apply, create entry, load
   draft/published aggregate, list entries with cursor, save complete draft,
   publish guarded draft, delete entry, list public data, and build export.
3. Define `ObjectStorage`, `Cache`, `SiteBuildTrigger`, `Clock`, `IdGenerator`,
   password-safe token hashing, and dispatcher lease ports.
4. Define input/output types independently of REST DTOs and database rows.
5. Create in-memory fakes in `packages/test-utils` that enforce the same revision,
   route, singleton, and immutability invariants expected from SQL.

### Session 4C — Use cases

1. Implement create/list/get/save/publish/delete content use cases against ports.
2. Save accepts the full draft aggregate and expected revision; it applies draft
   validation to fields, blocks, media IDs, order, and byte limits before one
   atomic write. Publish reruns strict publish validation.
3. Publish validates, resolves the future route, calls the guarded atomic port,
   separates publication success from build status, and honors idempotency keys.
4. Delete requires `content:publish` when public output exists.
5. Add tests for permission denial, singleton races, revision conflicts, route
   conflicts, idempotency reuse, draft isolation, and unchanged published data
   after later draft edits.

### Acceptance

- The in-memory vertical slice can create a page, save blocks, publish it, edit
  the draft again, and still read the previous published value.
- Application and domain package dependency checks prove they do not import
  transport/framework/infrastructure packages.

**Session boundary:** L; use 4A, 4B, and 4C as three sessions.

## Step 5 — SQLite schema and Node persistence

**Outcome:** the application core runs against a real SQLite database with the
same atomic guarantees later required from D1.

### Session 5A — Schema and migrations

1. Implement the Drizzle SQLite schema for content models, entries, snapshots,
   blocks, routes, media, media references, published state, outbox events, site
   builds, idempotency records, installation state, setup tokens, API tokens, and
   rate-limit buckets.
2. Add every check, unique/partial index, foreign key, cascade/restrict action,
   and dispatcher lease column specified by the architecture. Add indexes for
   entry listing, route lookup, snapshot block order, media reference lookup,
   outbox availability, and build history.
3. Generate the first forward migration and a migration metadata/version query.
4. Enable WAL and foreign keys for Node connections. Keep SQL within the shared
   SQLite/D1 subset; any driver-specific pragma stays in the Node composition
   layer.
5. Test migrating an empty file and reopening it with all invariants enabled.

### Session 5B — Node repositories

1. Implement row mappers and read repositories with bounded queries and cursor
   pagination. Cursor payloads are base64url-encoded, versioned JSON validated
   before use. Admin entry lists order by `(updated_at DESC, id DESC)`; public
   collection lists order by `(published snapshot created_at DESC, entry id DESC)`.
   Cursor values are query boundaries, never authorization claims, so they do not
   require a signature.
2. Implement entry creation and complete-draft save with `better-sqlite3`
   transactions. A save replaces/upserts block rows and rebuilds draft media
   references atomically, then increments revision once.
3. Implement public route/media lookup and build export without N+1 queries.
4. Keep published snapshot mutation methods impossible to call through the
   ordinary draft repository API.

### Session 5C — Atomic publication and repository contracts

1. Implement Node publication in the same statement order as the architecture's
   guarded D1 batch, even though it runs inside an interactive transaction.
2. Copy blocks and media references with `INSERT ... SELECT`; update published
   version, route, idempotency record, and coalesced outbox event atomically.
3. Implement published-entry deletion and media delete marking.
4. Build a reusable repository contract suite in `test-utils`. It must assert
   cardinality, revision guards, route rollback, immutable publication,
   idempotency, reference projection, cascades, outbox coalescing, and cursor
   order.
5. Run the suite against a temporary file and in-memory SQLite.

### Acceptance

- Killing or throwing at each injected transaction checkpoint leaves either the
  old state or the complete new state, never a partial publication.
- `EXPLAIN QUERY PLAN` fixtures confirm indexed route, block-order, media-use,
  entry-list, and outbox scans.

**Session boundary:** L; 5A, 5B, and 5C are separate sessions.

## Step 6 — Configuration synchronization

**Outcome:** stored model identities can be reconciled safely with code-first
configuration before serving traffic.

### Session 6A — Planner

1. Implement a pure sync planner comparing normalized config with stored model
   key, kind, version, and hash.
2. Classify operations as create, label-only update, compatible version update,
   explicit rename, blocked removal, or incompatible change.
3. Refuse kind changes, version regressions, structural hash changes without a
   version bump, ambiguous rename hints, removals with entries, and incompatible
   changes with any draft or published snapshot.
4. Render deterministic human and JSON reports. `--check` returns non-zero when
   an apply would be needed or when the plan is invalid.

### Session 6B — Atomic apply

1. Apply an approved plan through a specialized repository operation.
2. Rename model foreign keys and the primary key atomically when `renamedFrom`
   is valid. Do not infer renames.
3. Create a missing singleton entry for each new page with model-label title,
   configured defaults, and the `system:content-sync` actor.
4. When the public projection changes, increment published state and enqueue one
   build request in the same transaction.
5. Add dry-run, apply, repeat-apply idempotency, and concurrent-sync tests.

### Acceptance

- Re-running sync with unchanged config performs no writes.
- `--check` never mutates data.
- Failed plans print exact model/field reasons and preserve all stored content.

**Session boundary:** M; 6A and 6B are separate sessions.

## Step 7 — REST contracts and Node API

**Outcome:** the content vertical slice is accessible through versioned,
documented HTTP endpoints on Node.

### Session 7A — Shared contracts

1. In `packages/contracts`, define Valibot request/response schemas for content
   models, entry lists/details, complete draft save, publish, delete, public
   reads, build export, media metadata, builds, pagination, and errors.
2. Map every application error to one stable status/code pair. Validation issues
   use stable field paths and never expose stack traces or SQL text.
3. Define ISO timestamp transforms, opaque cursors, ETag headers, idempotency-key
   rules, and `If-Match`/body revision precedence. Prefer one canonical mechanism
   in generated clients: body `expectedRevision`; accept `If-Match` only as an
   equivalent HTTP affordance and reject disagreement.
4. Add schema round-trip and invalid-payload tests.

### Session 7B — Hono app factory

1. Build a runtime-neutral Hono app factory receiving normalized config, use
   cases, auth middleware, logger, rate limiter, and environment metadata.
2. Mount request IDs, structured logging, sanitized error handling, JSON/body
   limits, `/health/live`, `/health/ready`, `/api/v1/*`, and generated OpenAPI.
3. Register public and admin content routes with Standard Schema validation.
4. Implement build-export ETag from `published_state.version`; return `304`
   without loading the full export when `If-None-Match` matches.
5. Serve the built admin fallback only outside `/api/*` and health routes.

### Session 7C — Node composition and integration tests

1. Compose Hono, normalized config, SQLite repositories, system clock/ULID, no-op
   cache, placeholder object storage, and no-op build trigger in `apps/api` and
   `packages/platform-node`.
2. Add environment validation that fails startup with named missing/invalid
   variables and never logs secret values. Require canonical
   `LACE_PUBLIC_BASE_URL`; never derive public media URLs from request host
   headers.
3. Implement `pnpm dev:node` with same-origin API proxying for admin/site dev.
4. Add HTTP integration tests for the complete unauthenticated public path and a
   test-only actor adapter for admin behavior; production cannot enable it.
5. Generate OpenAPI in CI and fail on an uncommitted contract diff.

### Acceptance

- A seeded Node server supports create, save, publish, public read, and
  conditional build export entirely through HTTP.
- Database rows are never serialized directly.
- Readiness fails for unavailable DB/config and stays cheap enough for probes.

**Session boundary:** L; use 7A, 7B, and 7C.

## Step 8 — Authentication and authorization

**Outcome:** browser admins use Better Auth sessions, automation uses separate
hashed tokens, and every protected operation checks permissions.

### Session 8A — Better Auth and actor boundary

1. Add Better Auth Drizzle tables through a forward migration and configure
   email/password authentication with public sign-up disabled.
2. Store validated role on the user record with `viewer` default. Add an auth
   adapter that maps Better Auth session data to the application `Actor`.
3. Mount `/api/auth/*` before catch-all routes and add session middleware only to
   protected paths. Configure same-origin cookies, trusted origins, CSRF/origin
   rules, and production secure-cookie behavior.
4. Replace the test actor in production composition. Route handlers request
   permissions; they never compare role strings.

### Session 8B — Bootstrap, users, tokens, and abuse controls

1. Implement one-time setup-token creation/storage/expiry and the guarded,
   retryable first-admin protocol. Claim the token for the requested email hash
   before Better Auth user creation, resume the same claim after interruption,
   reject takeover by another email, and return `404` after setup completes.
2. Implement admin-only create/list/disable-user and role-change endpoints needed
   by the `/users` MVP route. Prevent removal/demotion of the last active admin.
3. Implement opaque build-token creation, hashed storage, prefix display,
   revocation, constant-time verification, and `last_used_at` updates. Only the
   build-export endpoint accepts the initial capability.
4. Apply the architecture's SQL fixed-window limits to auth, setup, token, and
   later upload routes through a narrow middleware/port. Store only HMAC bucket
   keys; responses use `429` and `Retry-After`.
5. Test cookie flags, origin rejection, expired/reused setup tokens, revoked build
   tokens, permission matrix, and last-admin protection.

### Acceptance

- Anonymous users can access only documented public item/media routes, not
  build-export or admin routes.
- Editor cannot publish; viewer cannot mutate; admin can perform all matrix
  operations.
- No plaintext setup/build token is stored or logged.

**Session boundary:** M; 8A and 8B.

## Step 9 — Media backend and MinIO

**Outcome:** authenticated users can safely upload, reuse, view, and recoverably
delete media without storing binary data in SQL.

### Session 9A — Storage-neutral media use cases

1. Implement upload validation for the 10 MiB limit and exact MIME allowlist.
   Detect magic bytes, reject SVG/polyglot/empty/truncated files, sanitize the
   display filename, and generate an opaque storage key.
2. Extract image dimensions with a library proven to run in both target runtime
   builds or behind a portable metadata port. Enforce pixel/dimension ceilings to
   limit decompression bombs.
3. Implement create/list/get/delete/retry use cases. Metadata insertion happens
   only after a successful object put; a failed metadata insert triggers
   best-effort object cleanup and an error log with the storage key.
4. Validate media references during complete draft save and rebuild the
   relational reference projection.

### Session 9B — MinIO and HTTP

1. Implement Node S3-compatible storage against MinIO with streaming put/get,
   explicit timeouts, and bucket existence/startup checks.
2. Add admin multipart upload/list/delete/preview routes and the public stable
   media route. Public access requires a join to a currently published snapshot;
   admin preview requires `content:read`.
3. Add Docker Compose MinIO for development with persistent named volumes and no
   hard-coded production credentials.
4. Test filename/header injection, MIME mismatch, size cutoff while streaming,
   unauthenticated draft probing, and storage/database failures.

### Session 9C — Recoverable deletion

1. Implement generic outbox leasing sufficient for `media.delete.requested`:
   conditional claim, 60-second lease, bounded exponential retry with jitter,
   maximum-attempt visibility, and lease recovery.
2. On dispatch, delete the object idempotently, then remove the `deleting` media
   row. Set `delete_failed` plus sanitized error after terminal failure and expose
   an admin retry command.
3. Prove a concurrent draft save cannot select a deleting item and a concurrent
   delete cannot pass while a new reference commits.

### Acceptance

- No binary bytes enter SQLite.
- A published image remains reachable through its stable Lace URL across signed
  URL expiry.
- Storage outage leaves retryable metadata rather than a broken published
  reference.

**Session boundary:** L; use 9A, 9B, and 9C.

## Step 10 — Public SDK and reference Astro site

**Outcome:** a static Astro build consumes only published Lace contracts and
renders the starter content safely.

### Session 10A — SDK

1. Implement `createLaceClient` on injected/global `fetch` with base URL,
   optional build token, timeout/abort, stable user agent, and typed errors.
2. Implement page, collection pagination, collection-by-slug, by-path,
   build-export, and public-media URL helpers. Automatically follow collection
   cursors only in an explicitly named `getAll...` method.
3. Implement conditional build-export support and response validation; malformed
   server data is a contract error, not unchecked JSON.
4. Add fetch-mock tests for status mapping, aborts, cursors, `304`, token scoping,
   and base-path normalization.

### Session 10B — Astro fixture

1. Build `apps/site` with home and blog routes matching the starter config.
2. Implement Astro components for all five built-in blocks and a safe Tiptap
   allowlist renderer. Unknown block types fail the build with model, entry, and
   block identifiers.
3. Fetch one build export per build and derive static paths/data locally; do not
   issue one request per page.
4. Add a seeded export fixture and CI build proving draft content is absent,
   routes are generated, media URLs are stable, and unsafe rich text cannot be
   rendered.

### Acceptance

- The site builds with no CMS access when given the committed test export.
- The live mode builds through one authenticated export request.
- SDK has no admin-session or content-mutation capability.

**Session boundary:** M; 10A and 10B.

## Step 11 — Admin foundation

**Outcome:** users can sign in and navigate a responsive, accessible admin shell
driven by server configuration.

### Session 11A — UI system and routing

1. Configure React/Vite, TanStack Router, TanStack Query, Tailwind, and Radix.
2. Define Lace design tokens for color, typography, spacing, radius, focus, and
   motion. Build owned Button, Input, Select, Dialog, Toast, Table, Badge,
   Skeleton, EmptyState, and ErrorState components with Storybook or an
   equivalent isolated preview only if it does not delay the vertical slice.
3. Implement typed routes for login, content, model, entry, media, builds, users,
   and settings. Route guards load the session and redirect without flashing
   protected content.
4. Meet keyboard focus, label, contrast, reduced-motion, and narrow-screen shell
   requirements from the start.

### Session 11B — Remote state and lists

1. Implement the credentialed admin client from shared schemas, with one error
   mapper and request ID surfaced in technical details.
2. Load model projection to build navigation. Page items link directly to the
   singleton editor; collections show cursor-paginated entries.
3. Add create/delete entry flows with permission-aware controls. Hiding a button
   is convenience only; the API remains authoritative.
4. Add login/logout, expired-session recovery, loading/empty/error states, and
   query invalidation rules.

### Acceptance

- Viewer, editor, and admin shells show the correct affordances.
- Keyboard-only navigation reaches all current actions.
- Refreshing any client route is served by the API/admin composition root.

**Session boundary:** M; 11A and 11B.

## Step 12 — Draft and block editor

**Outcome:** editors can manage the entire draft aggregate without violating
revision or publication isolation.

### Session 12A — Metadata-driven fields

1. Build a field-renderer registry over serializable metadata for every MVP field
   type. React Hook Form owns editable values; Valibot validates locally using a
   client-safe compiled schema.
2. Implement title and collection slug as explicit system fields. Slug suggestion
   is opt-in and stops auto-updating after manual edits.
3. Add dirty-state navigation protection, accessible field errors, save status,
   and no implicit autosave in the MVP.
4. Save through one complete-draft `PUT` with expected revision and replace local
   state only from the validated server response.

### Session 12B — Blocks and rich text

1. Implement add, duplicate, remove, collapse, and keyboard/drag reorder for
   allowed blocks. Preserve stable block keys; the browser generates ULIDs for
   new blocks and the server accepts them after format and per-snapshot uniqueness
   validation.
2. Use sparse positions locally but send an ordered list; the server assigns or
   normalizes canonical positions.
3. Integrate Tiptap with exactly the shared allowlist and no raw HTML extension.
4. Add generic built-in block forms and media-picker placeholders connected to
   the media API from step 9.

### Session 12C — Publication and conflict UX

1. Show draft revision, last editor/time, published state, resolved public path,
   and latest target/build status.
2. On `CONTENT_REVISION_CONFLICT`, preserve the user's unsaved values and offer
   “reload server draft” or “copy my JSON”; do not implement an unsafe automatic
   merge.
3. Add admin-only publish with explicit confirmation and idempotency key retained
   across network retries. Show “published/build pending” separately from build
   success.
4. Add component tests and Playwright coverage for add/edit/reorder/save,
   concurrent conflict, editor publish denial, admin publish, and later draft
   edits not changing public output.

### Acceptance

- Every Save increments revision once regardless of how many fields/blocks
  changed.
- Reloading after a conflict cannot overwrite the local draft without an explicit
  user choice.
- Rich text and URLs rejected by the server are also identified in the form.

**Session boundary:** L; use 12A, 12B, and 12C.

## Step 12.5 — Local development environment

**Outcome:** a contributor can start the complete Node/SQLite/MinIO/API/Admin/
Astro browser stack from a clean configured checkout, bootstrap a first local
administrator, and repeat a non-destructive smoke verification before Step 13
begins the local content workflow.

### Substeps

1. Expand the development Compose topology to include persistent SQLite and
   MinIO data, idempotent bucket initialization, forward migrations, the Node
   API gateway, Admin Vite, and Astro development servers. Use health checks and
   dependency conditions instead of fixed sleeps; mount workspace sources while
   isolating container-native dependencies. Do not add a builder, release
   directory, production reverse proxy, public object bucket, or hard-coded
   credentials.
2. Make `pnpm dev:node` the single Node local-start command. Add documented
   start/stop/log/reset/bootstrap/smoke commands that delegate to one Compose
   topology. Preserve API and health namespaces at the Node gateway, support
   frontend development upgrade traffic, and make reset the only explicitly
   destructive operation. The local bootstrap helper must mint the existing
   one-time setup token and never seed a password or write a plaintext token.
3. Complete `.env.example` with every required local setting but no usable
   secret. Replace the root README with the canonical developer guide covering
   prerequisites, first start, first-admin setup, local URLs, normal operations,
   testing, quality gates, resets, and troubleshooting; reconcile focused Node,
   authentication, and migration references.
4. Add a `dev:smoke` command that creates a unique temporary Compose project,
   waits with bounded polling, verifies API, admin, site, and MinIO reachability,
   and cleans up only resources it created. Cover root lifecycle helpers and
   gateway routing/upgrade behavior with focused tests.

### Acceptance

- A clean configured checkout starts the full browser stack with `pnpm dev:node`;
  API, Admin, and site requests use the documented Node origin, while MinIO
  remains private.
- Normal stop/start preserves only the named Lace development data; reset is
  explicit, clearly destructive, and cannot target arbitrary Docker resources.
- `pnpm dev:smoke` is repeatable and does not alter an existing local stack or
  its data.
- The README alone is sufficient to complete first run, create an administrator,
  sign in, run tests, and diagnose common local failures.

**Session boundary:** S; complete as one session under the OpenSpec change
`m12d-local-dev-stack`.

## Step 13 — Local code-first configuration and sync

**Outcome:** a contributor can define a page or collection in version-controlled
configuration, synchronize it with local SQLite, and immediately find it in the
browser admin. Model structure remains code-first; content values remain
admin-managed. This advances the local Node portion of Step 23B without replacing
its cross-environment operational CLI.

### Session 13A — Project configuration entry point

1. Add a root `lace.config.ts` with the existing home page and posts collection as
   editable examples. Load and normalize this file in the Node development
   composition instead of using the hard-coded development configuration.
2. Preserve the architecture's typed page, collection, field, and block
   definitions. Changing a model key, path, route, or structure follows the
   existing version and `renamedFrom` rules; do not add browser-based model
   creation or arbitrary TypeScript evaluation through HTTP.
3. Document how a contributor defines a page or collection, chooses its Astro
   route and rendering code, and restarts the development API when configuration
   changes. Keep the sample project usable from a clean checkout.

### Session 13B — Local sync and empty-state guidance

1. Wire a local-only `content:sync` command to the existing planner and guarded
   Node apply operation. Show the plan before mutation, support non-mutating
   `--check`, and reject invalid or stale plans with actionable diagnostics.
2. Keep synchronization explicit. Startup and migration do not silently create,
   rename, or remove models. Sync creates singleton page drafts; collection
   entries are created later through the admin/API.
3. Make `/admin/content` explain the empty-model state and the local sync step.
   Distinguish no configured models, pending synchronization, and an API error
   where the available server information permits it.
4. Test first sync, repeated no-op sync, changed configuration, blocked unsafe
   changes, and the browser path from synced models to a page editor or
   collection list. Update the local developer guide.

### Acceptance

- A clean local checkout can synchronize its example models without a generated
  project or production deployment.
- A newly defined page gets exactly one editable draft; a newly defined
  collection appears with an empty entry list and a permitted create action.
- `--check` and failed plans preserve SQLite content and public state.

**Session boundary:** M; use 13A and 13B as separate OpenSpec changes.

## Step 14 — Live local Astro site

**Outcome:** the local site renders content published through the admin instead
of relying on the fixture export. The fixture remains available for isolated
reference-site tests.

### Session 14A — Published-content development mode

1. Connect the Astro development process to the local published-content API with
   a read-only build token, using the existing SDK and same-origin local stack.
   Document token setup through the existing admin API until the Settings screen
   in Step 15B exposes token management. Keep secrets on the server side and
   retain fixture mode for deterministic tests.
2. Ensure local content changes are visible through a documented refresh or
   restart workflow before automated build dispatch exists. Explain that saved
   drafts do not change the public site until publication.
3. Cover missing or invalid build tokens, an unavailable API, and a published
   export with no home page using actionable local errors.

### Session 14B — Code-owned routes and end-to-end content proof

1. Demonstrate one additional page and one additional collection using
   `lace.config.ts`, matching Astro route files, and the existing block renderer.
   Preserve the rule that the CMS validates route patterns but does not create
   Astro route files or choose site presentation.
2. Verify local sync, admin draft editing, publication, published-only API
   output, and the resulting Astro pages in one browser-level flow. Verify a
   later draft remains invisible on the public site until published.
3. Document the repeatable developer workflow for a new page, collection,
   field, and block, including which changes require a config version bump.

### Acceptance

- The local Astro site displays the latest published content from local SQLite
  after the documented refresh or restart step, without editing a JSON fixture.
- Adding a new code-owned route and synchronizing its model produces an editable
  admin surface and the expected public URL.

**Session boundary:** M; use 14A and 14B as separate OpenSpec changes.

## Step 15 — Complete browser-admin workflows

**Outcome:** a user can manage content, media, access, and operational settings
through the existing local browser stack before deployment tooling is expanded.
The server remains authoritative for permissions and validation.

### Session 15A — Media library and reuse

1. Replace the `/media` placeholder with browse, upload, preview, pagination,
   and permitted deletion/recovery controls backed by the existing media API.
2. Connect media selection in fields and blocks to the library, including a clear
   empty state, upload progress, validation errors, and inaccessible media.
3. Verify keyboard access and browser flows for upload, reuse, and failure
   recovery. Keep object storage credentials out of browser responses.

### Session 15B — Users and settings

1. Replace the `/users` placeholder with the existing admin-only user list,
   creation, role-change, and disable flows. Surface last-admin protection and
   API errors without suggesting a failed change succeeded.
2. Replace the `/settings` placeholder with the available status and API-token
   operations needed to configure and inspect a local site. Add missing
   read-only status contracts only when they have a concrete operator use.
3. Verify admin/editor/viewer affordances against server authorization, session
   expiry recovery, and safe handling of once-shown token values.

### Session 15C — Local product acceptance

1. Exercise a clean local setup from configuration sync through page editing,
   collection-entry creation, media upload/reuse, publication, and Astro output.
2. Test role restrictions, draft/published isolation, conflict recovery,
   responsive navigation, keyboard access, and the empty/error states of each
   now-functional route.
3. Resolve concrete product-flow gaps found by this pass before acceptance.
   Revise the active OpenSpec artifacts first when a fix changes accepted
   behavior; keep broader feature ideas in later, just-in-time changes rather
   than hiding them in the release gate.

### Acceptance

- An administrator can complete the local editorial flow without modifying a
  fixture or calling the content API by hand.
- Content, Media, Users, and Settings have useful behavior or an explicit,
  justified operational state; Builds gains its history/retry screen in Step 21.
  Viewer and editor permissions remain enforced by the API.
- A local product walkthrough can be repeated before any VPS, Cloudflare, or
  generated-project work starts.

**Session boundary:** L; use 15A, 15B, and 15C.

## Step 16 — Admin design foundation and structure

**Outcome:** the admin has an owned design system, a layered source structure,
and the existing behavior running unchanged inside it, so later steps can
rebuild screens one at a time.

The visual reference for Steps 16–20 is direction A of the admin redesign
canvas: a neutral inset-panel shell, indigo accent, Inter, 13px base text,
stacked collapsible block cards, and a right-hand editor column that holds
publication status and entry fields. Dark mode, a command palette, site-wide
search, and an activity feed are deferred beyond the MVP; the token structure
must allow dark mode later without rewriting components.

### Session 16A — Architecture, tooling, and tokens

1. Update architecture §17 and §19 and record an ADR: shadcn/ui generated on
   Radix as Lace-owned source (not a themed dependency), `lucide-react`,
   `sonner`, `@tanstack/react-table`, `react-dropzone`, `react-day-picker`, and
   self-hosted Inter through `@fontsource-variable/inter`.
2. Document the admin source layers and their import direction:
   `app → pages → widgets → features → entities → shared`. Slices in one layer
   do not import each other, every slice exposes only its `index.ts`, and every
   React component lives in its own PascalCase folder with its test and
   `index.ts`.
3. Define color, typography, spacing, radius, shadow, focus, and motion tokens
   as CSS variables in the shadcn convention. Ship the light theme only, with a
   theme selector structure that can add dark values later. Replace hand-written
   component CSS with Tailwind utilities over those tokens.
4. Add a lint check that rejects raw color literals in admin components.

### Session 16B — Layered skeleton and code migration

1. Create `app/`, `pages/`, `widgets/`, `features/`, `entities/`, and `shared/`
   under `apps/admin/src`, and extend `scripts/check-boundaries.mjs` so layer
   direction and slice public APIs are enforced by `pnpm lint`.
2. Generate the shadcn primitives (Button, Input, Textarea, Select, Dialog,
   Sheet, DropdownMenu, Popover, Tooltip, Badge, Table, Tabs, Skeleton, Toaster,
   Calendar, ScrollArea) and move each into `shared/ui/<Component>/`.
3. Move the admin client, error mapper, session, editor form, field renderer
   registry, and rich-text editor into `shared` and `entities`. Move each route
   screen out of `app.tsx` into its `pages/<route>/` folder without behavior
   changes; keep the code-based TanStack route tree in `app/router/`.
4. Move Playwright specs to `apps/admin/e2e/`. Existing component and browser
   tests pass unchanged in intent.

### Acceptance

- `pnpm lint` fails on an upward or cross-slice import.
- Every existing admin workflow still passes its tests after the move.
- No component in the new structure uses a raw color literal.

**Session boundary:** M; 16A and 16B.

## Step 17 — Shell and collection lists

**Outcome:** navigation and collection lists show what exists, its state, and
who changed it, without exposing internal identifiers.

### Session 17A — List fields and list contracts

1. Add optional `listFields` to `defineCollection`. Configuration validation
   rejects unknown and non-scalar fields; the admin configuration projection
   carries the list.
2. Extend the entry summary DTO with `slug`, a derived `status`
   (`draft`, `published`, or `changed`), `publishedAt`, `updatedBy` with
   `id` and `displayName`, and the values of the model's `listFields`.
3. Add entry-list query parameters `q` (title or slug), `status`, and `sort`,
   plus per-status totals. The full entry DTO also exposes the last editor's
   display name so viewers never need the users API to render it.
4. Cover the contracts, OpenAPI output, repositories, and negative cases.

### Session 17B — Application shell

1. Build the inset-panel shell: sidebar grouped into Pages, Collections,
   Library, and Admin with icons, counts, and role-aware items; a user menu with
   name, role, and log out; and a header with breadcrumbs.
2. Collapse the sidebar into a sheet on narrow screens and keep keyboard order
   and focus return correct.
3. Rebuild `/content` as an overview of pages and collections with status
   summaries.

### Session 17C — Collection list

1. Rebuild the collection route with TanStack Table: title with slug, status
   badge, `listFields` columns, published date, and relative edit time.
2. Keep search, status filter, and sort in router search parameters; paginate
   with the API cursor.
3. Restyle create and delete entry dialogs and add empty, loading, and error
   states.

### Acceptance

- A viewer, editor, and admin see the same list data with role-appropriate
  actions only.
- Reloading a filtered list URL restores the same filters.
- No list or shell surface shows a raw user or entry ID.

**Session boundary:** L; use 17A, 17B, and 17C.

## Step 18 — Media library

**Outcome:** editors browse, upload, inspect, and reuse images visually.

### Session 18A — Media contracts

1. Add media-list query parameters `q` (filename), `type`, and `sort`.
2. Record image width and height on the server at upload.
3. Expose where an item is used (entries and blocks), reusing existing reference
   data when it exists and adding it otherwise; deletion guidance uses the same
   data.

### Session 18B — Library screen

1. Rebuild `/media` as a tile grid with lazily loaded previews, type filters,
   search, sort, and a grid/list toggle.
2. Add a drop zone over the library plus multi-file upload with per-file
   progress, client-side type and size checks, and per-file server errors.
3. Add a details side panel with preview, type, dimensions, size, uploader,
   usage, copy URL, and confirmed deletion that respects recoverable deletion.

### Session 18C — Media picker

1. Replace the inline picker with a dialog that reuses the library grid, search,
   and in-dialog upload.
2. Show selected media in fields and blocks as a thumbnail with filename,
   Replace, and Remove, with explicit states for deleted or inaccessible items.

### Acceptance

- An editor can upload several images, see failures per file, and reuse an
  uploaded image in a block without leaving the editor.
- Keyboard users can open, choose, and close the picker and details panel.
- Object-storage credentials never reach the browser.

**Session boundary:** L; use 18A, 18B, and 18C.

## Step 19 — Block editor

**Outcome:** editing a page or entry is clear at a glance: the active block is
obvious, collapsed blocks stay recognizable, and publication state reads as
plain language.

### Session 19A — Editor layout and fields

1. Add a sticky header with breadcrumbs, unsaved-changes indicator, Save with
   `⌘S`/`Ctrl+S`, and Publish; render the title as a large input.
2. Add the right-hand column: publication status, live and draft revisions,
   last editor and relative time, public URL, latest build state, and the
   entry's slug and model fields.
3. Rebuild field renderers on the new primitives, including Select, a date
   picker, URL, boolean, and number fields. Restyle the publish confirmation and
   revision-conflict dialogs without changing their semantics.

### Session 19B — Block cards

1. Add optional `description` to block definitions and carry it in the block
   projection. The admin maps built-in block types to icons and uses a default
   icon for other blocks.
2. Render each block as a card with drag handle, icon, type, and a summary
   derived from its data; support collapse and expand, highlight the block being
   edited, and fix overlapping header text.
3. Add an actions menu (move up, move down, duplicate, remove with undo), an
   insert control between blocks, and an Add block menu with filter, icons, and
   descriptions. Keep keyboard and drag reordering.

### Session 19C — Rich text and validation

1. Add a fixed Tiptap toolbar for paragraph and heading level, bold, italic,
   strike, code, lists, quote, and links; links use a URL popover validated
   against the shared allowlist.
2. Add keyboard shortcuts and placeholders.
3. Show validation errors on fields and blocks plus a summary that links to the
   first invalid block; server rejections map to the same locations.

### Acceptance

- Adding, collapsing, reordering, and editing blocks keeps stable block keys and
  saves one revision per Save.
- Publication, build, and conflict states are shown without raw IDs or ISO
  timestamps.
- Every editor action is reachable by keyboard.

**Session boundary:** L; use 19A, 19B, and 19C.

## Step 20 — Remaining screens and redesign acceptance

**Outcome:** every admin route uses the new design system and structure, and the
legacy admin code is gone.

### Session 20A — Login, users, and settings

1. Rebuild login, users (table, role change, disable, create dialog), and
   settings (status cards, API token table, once-shown token dialog).
2. Add a not-found route and consistent empty, loading, and error states.

### Session 20B — Redesign acceptance

1. Add automated accessibility checks with `@axe-core/playwright` on every
   route, and complete a keyboard-only walkthrough.
2. Verify narrow-screen layouts, including the editor column stacking below the
   blocks, and confirm no component bypasses the theme tokens.
3. Repeat the Step 15C local product walkthrough on the redesigned admin.
4. Delete `app.tsx` and the legacy `components/ui.tsx`, and update admin and
   acceptance documentation.

### Acceptance

- No admin source remains outside the layered structure.
- Accessibility checks pass on every route.
- The local editorial walkthrough succeeds without fixture edits.

**Session boundary:** M; 20A and 20B.

## Step 21 — Outbox, build tracking, and VPS builder

**Outcome:** publication reliably causes a coalesced static build and operators
can see/retry failures.

### Session 21A — Site-build dispatch

1. Extend the generic dispatcher for `site.build.requested`. Use the architecture
   defaults: 5-second debounce, 60-second leases, full-jitter exponential backoff
   from 5 seconds capped at 15 minutes, and 8 total attempts. Keep these values
   centralized and testable.
2. Atomically claim an event and create a `site_builds` row with target published
   version. Publications after claim create the next pending event.
3. Define trigger outcomes as accepted with provider ID, synchronously succeeded,
   or failed. Store `pending/running/succeeded/failed` transitions and timestamps.
4. Add manual admin build request and retry semantics; both still coalesce through
   the outbox.

### Session 21B — Fixed-command builder

1. Build `apps/builder` as a private service accepting only an authenticated
   trigger containing build ID and target version. Reject command, path, env, or
   arbitrary argument fields.
2. Copy the read-only mounted site project into a temporary work directory,
   install with frozen lockfile using an image-pinned toolchain, run the fixed
   Astro build, and write to a new release directory. Use the reference project
   until Step 23 supplies the generated-project template; the generated project
   must then pass the same builder contract.
3. Atomically switch the static-output `current` release only after success; keep
   the previous successful release and clean older releases by fixed retention.
4. Return sanitized logs/status to the API without secrets or full environment
   dumps. Authenticate API-to-builder with a dedicated secret and no public port.

### Session 21C — VPS composition and build UI

1. Complete Docker Compose with API, MinIO, builder, and static reverse proxy,
   named database/object/output volumes, health checks, and internal networks.
2. Run a recovery dispatcher loop in a separate process/service so API restarts
   do not abandon events.
3. Implement `/builds` history/detail/retry UI with target version, provider ID,
   timestamps, and sanitized errors, using the Step 16 design system and layered
   admin structure.
4. Add an integration test that publishes several entries rapidly, observes one
   normal build, serves the new release, then verifies a failed build leaves the
   previous release online and can be retried.

### Acceptance

- Publication commits successfully even when the builder is offline.
- Recovery after process termination dispatches the leased event after expiry.
- No HTTP input can choose a shell command or filesystem target.

**Session boundary:** L; use 21A, 21B, and 21C.

## Step 22 — Cloudflare runtime

**Outcome:** the same contracts and application behavior run locally and in a
Cloudflare Worker with D1 and R2.

### Session 22A — D1 persistence

1. Implement D1 read repositories and specialized atomic mutations using
   prepared statements and `batch()`. Never emulate an interactive transaction
   callback.
2. Publication uses guarded `INSERT ... SELECT`; every later statement is
   conditional on the new snapshot existing. Inspect affected rows and return a
   revision conflict on zero-row guard results.
3. Chunk complete draft block inserts within D1 bound-parameter and invocation
   query budgets while retaining one atomic batch and the 200-block/200-media-
   reference caps.
4. Run the reusable repository contract suite against local D1/Miniflare and add
   targeted tests for route-conflict rollback and concurrent revisions.

### Session 22B — R2, Worker, and scheduled recovery

1. Implement native R2 storage without the AWS SDK and the same media semantics
   as MinIO.
2. Compose Worker bindings for D1, R2, optional KV/no-op cache, deploy hook,
   secrets, and normalized statically imported `lace.config.ts`.
3. Enable the Better Auth compatibility flag, serve built admin assets under
   `/admin`, and preserve API/auth routing order.
4. Implement scheduled outbox recovery and event leasing. `waitUntil` may improve
   latency after commit but is never the only recovery path.

### Session 22C — Cloudflare development and deploy hook

1. Implement `pnpm dev:cloudflare` with persisted local D1/R2 state and same-origin
   admin/API proxying.
2. Add the Cloudflare deploy-hook trigger with timeouts, authentication kept in
   Worker secrets, provider ID capture where available, and failure mapping.
3. Add migration commands for local and remote D1 with explicit environment
   selection and confirmation outside CI.
4. Add smoke tests for auth, upload/R2, publish, scheduled dispatch, build export,
   static admin fallback, and health endpoints.

### Acceptance

- Node SQLite and local D1 pass the exact same repository contract suite.
- Worker bundle contains no Node-only SQLite, S3, filesystem, or secret material.
- Correctness is unchanged when KV is absent or stale.

**Session boundary:** L; use 22A, 22B, and 22C.

## Step 23 — CLI generator and operational commands

**Outcome:** a user can create an upgrade-aware Lace project and operate either
runtime without editing engine source.

### Session 23A — Generator

1. Implement `create-lace` commands `create <dir>` and `init .`. Resolve and
   validate the target path; allow only `.git`, `README.md`, and `LICENSE` in an
   otherwise empty target.
2. Generate user-owned `site/**` and `lace.config.ts`, root workspace files,
   `.env.example`, Docker Compose, optional Cloudflare workflow/config, and
   `.lace/manifest.json`.
3. Classify every template path as user-owned or managed. Record template version
   and SHA-256 for managed files only. Never include secrets in templates or the
   manifest.
4. Make generation transactional through a sibling temporary directory and
   atomic final rename where possible. On failure, leave the original target
   unchanged and report cleanup instructions.

### Session 23B — Migrate, sync, and bootstrap commands

1. Implement one CLI environment loader with named Node and Cloudflare targets;
   redact secret values in errors.
2. Wire `db migrate`, `content sync [--check]`, and `auth bootstrap` to the
   application services. Require explicit remote target selection; commands must
   not accidentally use production from a local default. Extend the local Node
   sync delivered in Step 13 rather than implementing a second sync policy.
3. Add machine-readable `--json`, non-interactive CI behavior, stable exit codes,
   and actionable human output.
4. Make migrations explicit deployment steps; API startup reports an outdated
   schema and fails readiness rather than auto-migrating production.

### Session 23C — Generated-project acceptance

1. Pack workspace packages locally and generate a project using the tarballs so
   tests do not accidentally resolve source-workspace imports.
2. Verify `pnpm install`, Node dev startup, migration, sync, bootstrap, login,
   edit, publish, Astro build, and Docker Compose production flow from the
   generated directory.
3. Verify the optional Cloudflare template bundles and passes local smoke tests.
4. Snapshot the generated tree and ownership manifest as a contract fixture.

### Acceptance

- A generated project contains no editable admin/engine source.
- The starter can be deleted and regenerated in tests with byte-stable managed
  files for the same template version.
- Commands never print passwords, tokens after their one allowed reveal, or
  complete environment values.

**Session boundary:** L; use 23A, 23B, and 23C.

## Step 24 — Upgrade safety

**Outcome:** engine upgrades preserve user source and never overwrite modified
managed files without an explicit resolution.

### Session 24A — Upgrade planner

1. Read the old manifest, hash current files, and compare old template, working
   tree, and new template as a three-way ownership decision.
2. Plan automatic dependency/image updates, unchanged managed-file replacement,
   conflicts for modified managed files, and no writes for user-owned paths.
3. Produce deterministic human/JSON plans and unified diffs. A dry run is the
   default until the user passes an explicit apply flag.
4. Validate manifest schema/version and refuse unknown newer formats.

### Session 24B — Apply and recovery

1. Apply conflict-free changes through temporary files and atomic renames; write
   the new manifest last.
2. For conflicts, write proposed files under `.lace/conflicts/<version>/` and
   leave working files untouched. Never resolve by choosing the new template
   automatically.
3. Print database/config migration instructions associated with the target engine
   version; do not auto-run production migrations.
4. Test unchanged upgrade, user-owned site edits, modified Compose conflicts,
   interrupted apply, repeated apply, and rollback using the preserved old
   manifest/template metadata.

### Acceptance

- A byte-different file under `site/**` is never rewritten.
- A user-modified managed file produces a reviewable diff and conflict artifact.
- Interrupted upgrades are detectable and safely repeatable.

**Session boundary:** M; 24A and 24B.

## Step 25 — MVP release gate

**Outcome:** both supported deployments satisfy the product flow, security
requirements, and operational recovery promises.

### Session 25A — Cross-runtime and browser suite

1. Run repository contracts against Node SQLite and local D1.
2. Run API contracts against Node and Worker composition roots using the same
   seeded data and expected response fixtures.
3. Complete Playwright scenarios for admin, editor, viewer, conflict, media,
   publish/build failure, and session expiry.
4. Build the Astro fixture from both runtime exports and compare canonical output
   data, routes, and media references.

### Session 25B — Security and resilience pass

1. Review auth/session configuration, CSRF/origin behavior, permission checks,
   rate limits, upload parsing, URL/rich-text sanitization, token hashing, secret
   redaction, and arbitrary-command/path resistance.
2. Fault-inject DB, object storage, deploy hook, builder, and process termination.
   Confirm retry, lease expiry, previous-release preservation, and admin status.
3. Test D1 query/parameter budgets at maximum block count and build-export size.
4. Audit dependency vulnerabilities and licenses; document accepted risks rather
   than silently suppressing them.

### Session 25C — Operations and release documentation

1. Write local development, generated-project, VPS deployment, Cloudflare
   deployment, backup/restore, migration, key rotation, build recovery, and
   troubleshooting guides.
2. Document health/readiness semantics and structured log fields. Add an
   operator checklist for migration/config hashes, object storage, latest build,
   and engine version.
3. Verify a backup/restore drill for SQLite + MinIO and D1 + R2 metadata/object
   coordination. State the consistency caveat and recommended maintenance window.
4. Produce an MVP traceability checklist mapping every “Included” product scope
   item and security requirement to tests and documentation.

### Final acceptance scenario

From a clean machine/project template:

1. Generate a Lace site with one command.
2. Start either Node/Docker or Cloudflare-local mode.
3. Migrate, sync config, and bootstrap the first admin.
4. Sign in, create/edit structured content, upload/reuse media, and reorder blocks.
5. Confirm an editor cannot publish and an admin can.
6. Confirm the public API and Astro site show the published snapshot only.
7. Edit the draft again and confirm public output is unchanged.
8. Observe a coalesced build, simulate failure, recover it, and serve the last
   successful static release throughout.
9. Run an upgrade dry-run and prove user-owned site source is untouched.

**Session boundary:** L; use 25A, 25B, and 25C. Do not combine the security pass
with the release-documentation session.

## 7. Recommended first delivery slices

The full roadmap is intentionally larger than a single development session. The
best checkpoints for demonstrating useful progress are:

1. **After step 3:** typed config and block definitions normalize identically in
   Node and a Worker-compatible build.
2. **After step 5:** a complete content lifecycle works against real SQLite
   without HTTP.
3. **After step 8:** the secured Node REST vertical slice supports bootstrap,
   draft, publish, and public read.
4. **After step 10:** the first end-to-end headless CMS path builds a static Astro
   site.
5. **After step 12:** the browser editor works for already synchronized models
   on Node; the clean-checkout content workflow is completed in later steps.
6. **After step 12.5:** both browser applications start locally, but content
   models and live site data still need the next steps.
7. **After step 13:** code-first models can be synchronized and edited in the
   local admin.
8. **After step 14:** published content reaches the local Astro site.
9. **After step 15:** the local editorial workflow covers content, media,
   users, and settings without fixture edits or direct content API calls.
10. **After step 20:** the admin runs on its owned design system and layered
    structure, with a visual media library and a readable block editor.
11. **After step 21:** the self-hosted VPS deployment works with the reference
    site, including recoverable builds and build history in the admin; generated
    projects are verified in Step 23.
12. **After step 22:** Cloudflare reaches behavioral parity.
13. **After step 23:** generated projects and full operational CLI commands pass
    acceptance on the supported runtimes.
14. **After step 25:** the MVP is release-ready.

Steps 0–3 should be implemented in order. After step 5, SDK fixture work and
some admin visual-foundation work may proceed in parallel, but persistence,
contracts, and auth remain the authoritative critical path. Cloudflare adapter
work should not start before the Node repository contract suite exists; otherwise
the two runtimes can drift without a shared behavioral oracle.
