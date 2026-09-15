## Why

Session 7B provides a runtime-neutral Hono application, but Lace still has no
deployable Node composition root that supplies its SQLite-backed capabilities or
proves the content lifecycle through HTTP. Session 7C completes Step 7's Node
API vertical slice before the authentication boundary in Step 8 replaces the
test-only admin actor.

## What Changes

- Implement roadmap Step 7, Session 7C: compose the Node API from normalized
  configuration, SQLite repositories, a system clock and ULID generator,
  non-authoritative no-op cache, placeholder object storage, and no-op build
  trigger.
- Validate Node runtime environment at startup, naming missing or invalid
  variables without revealing secret values; require canonical
  `LACE_PUBLIC_BASE_URL` and use it as the source of public media URLs.
- Replace the placeholder `pnpm dev:node` command with a same-origin Node
  development entry point that proxies admin/site development traffic while
  retaining the API and health namespaces locally.
- Add a production-disabled test actor adapter and HTTP integration coverage for
  seeded create, save, publish, public read, conditional build export, and
  readiness behavior.
- Generate the Hono OpenAPI document deterministically and make CI fail when
  the checked-in generated contract is stale.

## Capabilities

### New Capabilities

- `node-api-composition`: Node runtime composition, startup validation,
  same-origin development proxying, test-only administration, and API contract
  generation for the Step 7 Node API.

### Modified Capabilities

<!-- None. The portable Hono, REST, and SQLite requirements already describe
     the HTTP and persistence behavior; this change supplies their Node runtime
     composition and verification. -->

## Impact

- Affects `apps/api`, `packages/platform-node`, root scripts/CI, and Node HTTP
  integration fixtures/tests.
- Depends on accepted `hono-app-factory`, `rest-contracts`,
  `node-content-repositories`, `application-ports-and-commands`, and
  `configuration-synchronization` behavior, plus architecture sections 5–6 and
  roadmap Session 7C.
- Introduces no production authentication mechanism, object-storage backend,
  external build dispatch, or Cloudflare composition; those remain later
  roadmap work.
