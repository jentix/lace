## Why

Step 5 needs a portable, enforceable SQLite/D1 data foundation before Node
repositories can persist the content lifecycle implemented in Step 4. The
current `@lacecms/db` package is only a workspace placeholder, so no deployed
installation can yet create or verify its schema.

## What Changes

- Implement roadmap **Step 5, Session 5A — Schema and migrations** as the
  first forward-only Drizzle SQLite migration and migration metadata query.
- Define the shared SQLite schema for content models, entries, snapshots,
  blocks, published routes, media and reference projection, published state,
  outbox events and site builds, idempotency records, installation/setup/API
  token state, rate-limit buckets, and the Better Auth tables managed alongside
  the Lace schema.
- Encode the architecture's check constraints, foreign keys, referential
  actions, partial uniqueness, dispatcher lease columns, and required query
  indexes in the schema and generated migration.
- Add Node SQLite connection setup that enables foreign-key enforcement and
  WAL mode without placing Node-only pragmas in the shared schema.
- Verify a fresh database migration and reopen path, including schema version
  visibility and enabled Node invariants.

## Capabilities

### New Capabilities

- `sqlite-schema-and-migrations`: Portable SQLite/D1-compatible relational
  schema, forward migrations, Node connection initialization, and migration
  verification for a single Lace installation.

### Modified Capabilities

- None.

## Impact

- Affected code: `packages/db`, `packages/platform-node`, root database
  scripts, generated migration assets, and focused migration tests.
- Affected behavior: implements the persistence guarantees required by
  `content-domain-rules` and `application-ports-and-commands`, without adding
  repository operations (Session 5B) or publication transactions (Session 5C).
- Architectural basis: `docs/mvp-architecture.md` sections 4.4–4.7, 6, 9,
  10, 14–16, and 22; roadmap Step 5 / Session 5A.
- Dependencies: existing domain/application contracts, the pinned Drizzle and
  better-sqlite3 catalog versions, and Better Auth's SQLite schema definition.
- Non-goals: Node repository implementations, content synchronization,
  dispatcher execution, media-object storage, REST endpoints, and Cloudflare
  runtime wiring are deferred to their respective roadmap sessions.
