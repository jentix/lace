## 1. Planning documents and tooling

- [x] 1.1 Update `docs/mvp-implementation-roadmap.md` Session 22B to own D1 security-service persistence (setup/API tokens, rate limits, users) and verify the 22A text still matches this change's scope.
- [x] 1.2 Pin `miniflare` `5.20260903.0-alpha` in the pnpm catalog, add it as a `platform-cloudflare` dev dependency with the workspace packages it imports, and verify `pnpm install` succeeds and a Miniflare D1 binding opens in a probe.
- [x] 1.3 Allow `@lacecms/platform-cloudflare → domain, content` and `@lacecms/db → content` in `scripts/check-boundaries.mjs`; verify with `node scripts/check-boundaries.mjs` and `tests/boundaries.test.mjs`.

## 2. Schema and shared SQLite-dialect helpers

- [x] 2.1 Add the `mutation_guards` table (`token text primary key not null`, `created_at integer not null`) to the Drizzle schema, generate migration `0002` with `pnpm db:generate`, and verify the Node migration test reports three migrations and rejects a null token.
- [x] 2.2 Move runtime-neutral cursor codecs, row types/mappers, hydration, usage grouping, sanitizers, validation helpers, SQL fragments, and draft caps from the Node repository into `packages/db/src/sql-content.ts`, using `btoa`/`atob` instead of `Buffer`; verify `@lacecms/db` builds and a unit test proves cursor encoding is byte-identical to Node `Buffer` base64url.
- [x] 2.3 Switch `NodeContentRepository` to the shared helpers, enforce the 200-block/200-reference caps, and map a `published_routes.path` uniqueness failure to `CONTENT_ROUTE_CONFLICT`; verify the existing platform-node and API test suites pass.

## 3. Reusable repository contract suite

- [x] 3.1 Add `contentRepositoryContractCases` and its factory/SQL harness types to `@lacecms/test-utils`, porting the Node lifecycle cases (drafts, cardinality, publication, public reads, deletion guards, entry lists/cursors, media catalog/usage/deletion, dispatcher claims, site-build queue/transitions, configuration sync incl. rename and concurrent apply, checkpoint rollback) plus new route-conflict, idempotent replay, concurrent save/publish, and oversized-draft cases; verify `@lacecms/test-utils` builds.
- [x] 3.2 Run the suite in `platform-node` against migrated file-backed and in-memory SQLite, remove the duplicated inline tests while keeping Node-only pragma, query-plan, and prepare-count tests; verify `pnpm --filter @lacecms/platform-node test` passes.

## 4. D1 adapter

- [x] 4.1 Add structural D1 binding types, error mapping, guard/batch helpers (guard insert/delete, checkpoint failure injection, bound-parameter chunking, statement budget), and the D1 repository read paths (entries, lists, totals, public reads, build export, media reads/catalog/usage, actors, sync state, site-build history); verify with `pnpm --filter @lacecms/platform-cloudflare typecheck`.
- [x] 4.2 Implement D1 create, complete-draft save, publication (D3 statement order), deletion, configuration sync apply, media create/mark/retry/completion/failure, dispatcher claim/complete/retry, and site-build request/claim/renew/accepted/success/failure/complete mutations as single batches; verify typecheck and lint.
- [x] 4.3 Run the full contract suite against local D1 through Miniflare; verify `pnpm --filter @lacecms/platform-cloudflare test` passes with no skipped case.
- [x] 4.4 Add D1-targeted tests for route-conflict rollback, concurrent revisions, concurrent idempotent publication, a 200-block/200-reference save within 100 bound parameters and 50 queries, oversized-draft rejection, a late-chunk unavailable-media rollback, in-batch checkpoint failure, empty guard table after every mutation, and a source scan proving no Node-only imports; verify they pass.

## 5. Documentation and verification

- [x] 5.1 Update `docs/database-migrations.md` (migration 0002, guard table, contract suite runtimes including local D1) and verify the text matches behavior.
- [x] 5.2 Run root `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, the affected package tests, and `pnpm exec openspec validate step-22a-d1-persistence --type change --strict`; verify all pass.
