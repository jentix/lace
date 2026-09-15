## 1. Node runtime foundation

- [x] 1.1 Add the pinned Hono Node listener dependency and the minimal workspace package exports/scripts needed by `apps/api` and `packages/platform-node`; verify frozen installation and the affected package builds succeed.
- [x] 1.2 Implement injected Node environment parsing for database path, canonical public base URL, listener settings, and optional development origins; verify table tests name invalid variables without echoing supplied values and reject host-header-derived public URLs.
- [x] 1.3 Implement Node-only no-op cache, unavailable object-storage placeholder, no-op build trigger, request-ID/logger/rate-limiter defaults, and cheap SQLite readiness probe; verify focused unit tests cover misses, safe unavailable behavior, database probe failure, and liveness/readiness separation.

## 2. Composition and local operation

- [x] 2.1 Implement the `packages/platform-node` runtime factory that combines a normalized configuration, SQLite repository, clock, ULID-compatible IDs, portable content use cases, public reads, and operational capabilities into the portable Hono app; verify real temporary SQLite composition returns DTOs and closes its connection cleanly.
- [x] 2.2 Add an isolated test-only fixed-actor adapter and production anonymous resolver boundary; verify integration-only construction accepts explicit editor/admin actors while non-test construction and all request-controlled activation attempts fail.
- [x] 2.3 Implement the `apps/api` Node listener and same-origin development gateway, reserving API/health namespaces and routing `/admin` and site paths to validated upstreams; verify a local upstream fixture receives only eligible requests and unavailable upstreams return a sanitized failure.
- [x] 2.4 Document required Node environment variables, explicit migration/config-sync prerequisites, health semantics, development gateway origins, and the absence of production auth/storage/build dispatch; verify the documented commands and paths match package scripts.

## 3. HTTP and contract verification

- [x] 3.1 Add an ephemeral migrated SQLite HTTP integration fixture with synchronized normalized models and native `fetch`; verify create, save, publish, draft isolation, unauthenticated public reads, conditional build export, and database/config readiness entirely at the Node HTTP boundary.
- [x] 3.2 Add deterministic OpenAPI generation from an inert fixed composition, commit the generated `/api/v1` artifact, and add a stale-artifact check; verify modifying the generated file makes the check fail and regeneration restores it.
- [x] 3.3 Run the narrow Node/API tests, root typecheck, Oxlint, Oxfmt check, full test/build suite, and `pnpm exec openspec validate m07c-node-composition-integration-tests --type change --strict`; record no task complete until every command passes.
