## 1. Portable reads and transport failures

- [x] 1.1 Extend `PublicContentReadPort` with model-scoped collection pagination and a cheap `publishedContentVersion()` read; update the in-memory double and Node SQLite repository to filter before cursor generation and read `published_state.version`, and verify focused application/Node tests cover cursor isolation and the scalar version read.
- [x] 1.2 Extend `@lacecms/contracts` error-code schemas and safe rendering helpers for `NOT_FOUND`, `RATE_LIMITED`, and `PAYLOAD_TOO_LARGE`; verify focused contract tests assert their statuses, envelopes, and absence of internal detail.

## 2. Server factory foundation

- [x] 2.1 Add the Hono, Standard Schema validator, OpenAPI, Valibot JSON-Schema, and allowed workspace dependencies to `@lacecms/server` through the workspace catalog; verify the frozen lockfile and `pnpm --filter @lacecms/server typecheck` succeed.
- [x] 2.2 Define exported runtime-neutral factory input interfaces for content/public reads, actor resolution, request IDs, rate limiting, structured logging, readiness, environment metadata, request limits, and optional admin assets; verify compile-time tests show no Node, Cloudflare, database, or REST-DTO dependency leaks into application ports.
- [x] 2.3 Implement request-ID propagation, bounded JSON/body handling, rate-limit checks, sanitized error rendering, and one allowlisted structured completion log per request; verify focused Fetch tests cover validation/malformed/oversized/rate-limited/unexpected failures and secret-free log records.
- [x] 2.4 Implement `/health/live`, `/health/ready`, and generated `/api/v1/openapi.json`; verify focused tests distinguish liveness from failed readiness and validate the generated document includes versioned content routes.

## 3. Versioned content routes

- [x] 3.1 Register public page, collection list/item, and by-path reads from normalized configuration and public-read capability data using Standard Schema validation and shared DTO mapping; verify focused Fetch tests cover successful published reads, collection cursor reuse, invalid inputs, and absent resources.
- [x] 3.2 Register `/api/v1/public/build-export` with shared entity-tag parsing and `publishedContentVersion()` short-circuit behavior; verify tests prove matching `If-None-Match` returns `304` without calling `exportBuildContent`, while missing/old/malformed tags take the specified paths.
- [x] 3.3 Register authenticated admin model metadata, model entry list/create, entry load, complete-draft save, publish, and delete routes; verify focused Fetch tests cover actor absence, role/application authorization, strict request validation, revision normalization, idempotency forwarding, and DTO-only responses.

## 4. Namespace fallback and verification

- [x] 4.1 Add optional built-admin fallback handling exclusively outside `/api/*` and health paths; verify focused Fetch tests prove client-side admin routes delegate while unknown API/health paths return sanitized `NOT_FOUND` responses.
- [x] 4.2 Run the server and affected application/contracts/platform-node tests, then root `typecheck`, `lint`, `format:check`, and `pnpm exec openspec validate m07b-hono-app-factory --type change --strict`; record no deferred behavior and mark each task complete only after its stated verification passes.
