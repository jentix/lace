## Why

Roadmap Step 22 ("Cloudflare runtime"), Session 22A — D1 persistence. Every
application port except storage and the Worker shell already has a Node SQLite
implementation; Cloudflare parity (architecture §§1, 10, 15, 16) cannot start
until the same content, media, outbox, and site-build contracts persist in D1
without an interactive transaction. The roadmap also forbids Cloudflare adapter
work from drifting without a shared behavioral oracle, but today's Node
repository tests are inline, Node-specific scripts rather than a reusable suite.

## What Changes

- Add a D1 content repository in `@lacecms/platform-cloudflare` implementing the
  same ports as `NodeContentRepository` (entry reads and writes, publication,
  deletion, configuration sync apply/state, media catalog/usage/deletion,
  dispatcher leases, site-build queue/history/dispatch) through prepared
  statements and `D1Database.batch()`, never an interactive transaction callback.
- Publication runs as one guarded batch whose first statement is an
  `INSERT ... SELECT` of the new snapshot; every later statement is conditional
  on that snapshot existing, and a zero-row guard result is a revision conflict.
- Other multi-statement mutations use a batch-unique guard row that is inserted
  only when the mutation's precondition holds, required by every later
  statement, and deleted by the batch's final statement.
- Chunk complete-draft block and media-reference inserts to D1's 100 bound
  parameters per statement while keeping one atomic batch; enforce the
  200-block and 200-media-reference caps and a per-invocation query budget.
- Add forward migration `0002` creating the `mutation_guards` table (shared by
  both runtimes; unused by Node transactions).
- Extract runtime-neutral SQLite-dialect helpers (cursor codec, row mapping,
  hydration, sanitizers, shared SQL fragments) from the Node repository into
  `@lacecms/db` so both adapters map rows identically; Node behavior is
  unchanged.
- Build a factory-driven repository contract suite in `@lacecms/test-utils`
  from the existing Node lifecycle tests and run the exact same cases against
  file-backed SQLite, in-memory SQLite, and local D1 through Miniflare.
- Map a published-route uniqueness collision to `CONTENT_ROUTE_CONFLICT` in both
  adapters (previously Node reported the generic `CONTENT_INVALID_STATE`), as
  already required by the accepted content use-case specs.
- Add D1-targeted tests for route-conflict rollback, concurrent revisions,
  concurrent publication idempotency, bound-parameter chunking, and query budget.

## Capabilities

### New Capabilities

- `d1-content-repositories`: D1 persistence adapter behavior — guarded batches,
  conflict detection from affected rows, bound-parameter chunking, query
  budgets, and Worker-safe dependencies.

### Modified Capabilities

- `content-repository-contracts`: the suite becomes a reusable factory-driven
  oracle that Node SQLite (file and in-memory) and local D1 must pass
  identically, including route-conflict and concurrency cases.
- `sqlite-schema-and-migrations`: adds the batch mutation-guard table through a
  forward migration.
- `node-content-repositories`: a published-route collision reports the stable
  route-conflict code; Node row mapping comes from the shared SQLite-dialect
  helpers.

## Impact

- Code: `packages/platform-cloudflare` (new D1 repository and D1 binding types),
  `packages/db` (migration 0002, schema, shared SQL helpers),
  `packages/platform-node` (uses shared helpers, route-conflict mapping, tests
  moved into the contract suite), `packages/test-utils` (contract suite),
  `scripts/check-boundaries.mjs` (platform-cloudflare may import domain/content
  public entry points, matching platform-node).
- Dependencies: dev-only `miniflare` pinned in the catalog to the version used by
  the already-pinned `wrangler`.
- Database: one new forward migration applied by existing Node migration
  commands; D1 migration commands arrive in Session 22C.
- Non-goals: R2 storage, Worker composition, scheduled recovery, KV, Better
  Auth on D1, security-service (setup/token/rate-limit) D1 persistence, deploy
  hook, `pnpm dev:cloudflare`, and remote D1 migration commands (Sessions 22B/22C).
- Dependencies on prior work: Step 5 schema and Node repositories, Step 6 sync
  apply, Step 9 media deletion, Step 21A site-build dispatch.
