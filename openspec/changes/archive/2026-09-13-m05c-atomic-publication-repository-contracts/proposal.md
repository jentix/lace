## Why

Session 5B made SQLite durable for draft lifecycle operations, but the public
projection still exists only in the in-memory parity double. Session 5C closes
Step 5 by giving the Node adapter the guarded, atomic publication and deletion
semantics that the later D1 adapter must reproduce, and by making those
semantics executable through reusable repository contracts.

## What Changes

- Implement roadmap **Step 5, Session 5C — Atomic publication and repository
  contracts**.
- Add specialized Node SQLite publication and content-entry deletion operations
  that preserve the architecture's guarded D1-batch statement order within one
  `better-sqlite3` transaction.
- Copy publication snapshots, blocks, and media-reference projections with
  set-based SQL; atomically replace routes, advance public state, retain
  idempotent responses, and create or coalesce an unlocked site-build outbox
  event.
- Add media deletion marking that rejects referenced media and atomically marks
  an eligible item for asynchronous deletion with its non-coalesced outbox
  event.
- Provide a reusable repository contract suite in `@lacecms/test-utils`, and
  run it against both temporary-file and in-memory Node SQLite databases,
  including fault checkpoints and query-plan fixtures.

## Capabilities

### New Capabilities

- `content-repository-contracts`: reusable, adapter-neutral repository behavior
  contracts and fixtures for SQLite/D1 persistence implementations.

### Modified Capabilities

- `application-ports-and-commands`: adds the specialized portable command and
  complete result needed to atomically mark unreferenced media for deletion.
- `node-content-repositories`: adds atomic Node publication, published-entry
  deletion, media deletion marking, outbox coalescing, and their durable public
  projection behavior.

## Impact

- Affected code: `packages/platform-node`, `packages/test-utils`, existing
  application persistence ports, and focused Node/test-utils tests. The Session
  5A schema is consumed without a migration.
- Affected behavior: SQLite becomes the authoritative implementation for
  public-projection mutation, while build dispatch remains asynchronous and out
  of the transaction.
- Architectural basis: `docs/mvp-architecture.md` sections 4.4–4.7, 9.3–9.9,
  and 10; roadmap Step 5 / Session 5C; accepted
  `application-ports-and-commands`, `content-use-cases`,
  `node-content-repositories`, and `sqlite-schema-and-migrations` specs.
- Dependencies: completed Sessions 4A–4C, 5A, and 5B. No REST surface, object
  deletion dispatcher, D1 adapter, configuration synchronization, or builder
  execution is included.
