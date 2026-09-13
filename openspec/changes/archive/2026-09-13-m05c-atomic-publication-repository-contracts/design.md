## Context

See [proposal.md](./proposal.md) for motivation and the delta specs for the
required outcomes. Session 5A already supplies the portable SQLite/D1 schema,
including route, reference, outbox, idempotency, and public-state constraints.
Session 5B exposes a Node repository that creates/saves drafts and reads public
projections, but it deliberately does not implement its existing portable
publication/deletion commands. `@lacecms/test-utils` has an in-memory parity
double but no reusable contract runner for concrete persistence adapters.

## Goals / Non-Goals

**Goals:**

- Implement the specialized content and media command contracts without a
  generic transaction callback, preserving future D1 batch portability.
- Make SQLite public-projection changes transactionally atomic and use the
  architecture's guarded publication statement ordering.
- Establish reusable contract registration, deterministic fixtures, fault
  checkpoints, and explicit query-plan assertions for storage adapters.

**Non-Goals:**

- No schema migration, REST endpoint, authorization middleware, object-storage
  deletion, outbox dispatcher, site-build execution, or Cloudflare adapter.
- No application-level revision history, unpublish operation, or synchronous
  build trigger in a publication transaction.
- No new generic repository/transaction abstraction or ORM relation loading.

## Decisions

### Preserve the D1 publication batch as an explicit ordered SQLite transaction

`NodeContentRepository` will implement the existing specialized publication
port by running the architecture's eight ordered mutations in one
`better-sqlite3` transaction. The guarded `INSERT ... SELECT` snapshot copy
tests the entry's current draft pointer and expected revision; all later copy,
route, pointer, version, outbox, idempotency, and superseded-snapshot work is
conditional on that successful guard. Block and reference rows use set-based
`INSERT ... SELECT`, not hydrated JS loops.

The adapter will first check a supplied idempotency record within the same
transaction. A matching request hash maps the stored response back to the
portable result; a mismatched hash returns the stable conflict before any public
write. The result payload is stored only after every public mutation is valid.

Alternative considered: reuse domain publication helpers and persist a hydrated
aggregate. Rejected because it cannot preserve the D1 affected-row guard or
prove set-based copying and would add avoidable read/write gaps.

### Centralize public-version and build-event persistence in private Node helpers

A private helper will read/advance the singleton public state and issue a new
outbox ID supplied by the repository's explicit testable dependency. It will
insert-or-update the one eligible unlocked `site.build.requested` row, carrying
the newest version and debounce availability timestamp. Its update predicate
will exclude claimed rows; if the partial unique index cannot admit an unlocked
row because the previous event became claimed, it will retry the insert once as
part of the same transaction.

Published-entry deletion will reuse this helper after route removal and before
the entry delete. Draft-only deletion will not change public state. The entry
delete relies on existing foreign-key cascades for snapshots, blocks,
references, and routes. The portable deletion command will carry the deleting
actor and application-clock timestamp so its outbox/public-state mutation never
uses a Node-local clock or inferred identity.

Alternative considered: have the application use case trigger a build after
commit. Rejected because a crash between commit and enqueue would skip a public
version, and trigger execution belongs to the later dispatcher.

### Add a narrow portable media-deletion command and persistent mark operation

`@lacecms/application` will expose a separate media-deletion-mark command and
result, rather than expanding entry deletion or object storage. The Node
implementation will atomically verify no reference projection exists, condition
update an active row to `deleting`, and write one non-coalesced
`media.delete.requested` outbox record. It will return a stable invalid-state
failure for referenced, missing, or non-active media. The change deliberately
stops before dispatcher/object operations. The command receives the requesting
actor and application-clock timestamp, which become the row/event audit values
without consulting a Node-local clock.

Alternative considered: directly delete metadata and invoke object storage.
Rejected because foreign-key checks do not prevent an external storage
half-delete and the architecture requires retryable asynchronous cleanup.

### Make repository contracts factory-driven and database-observable

`@lacecms/test-utils` will export a contract registration function with a small
adapter fixture interface: create a freshly migrated repository connection,
seed deterministic models/media, inject named statement checkpoints, inspect
committed database state, and close/clean up. Platform-node tests will call the
same suite twice—temporary file and `:memory:`—while retaining focused unit
tests for Node-only mapper details.

Fault checkpoints will be injected immediately before each mutating statement
in draft save, publication, entry deletion, and media deletion marking. Each
contract captures the pre-operation normalized public and relational state,
forces one checkpoint failure, and confirms it is unchanged. `EXPLAIN QUERY
PLAN` fixtures assert the named architecture-required indexes for route,
block-order, media-reference, entry-list, and outbox queries.

Alternative considered: duplicate persistence scenarios in platform-node tests.
Rejected because the later D1 adapter would not inherit the executable behavior
contract and parity would regress.

## Risks / Trade-offs

- [An idempotency response becomes invalid after a later publication removes its
  referenced snapshot] → Store a self-contained portable response payload and
  map it without requiring the superseded snapshot to remain live.
- [The partial outbox unique index races with a dispatcher claim] → Use guarded
  update predicates and a single transaction-local retry that never modifies
  claimed work.
- [Fault hooks accidentally leak into production control flow] → Expose them
  only through an optional test-only repository dependency with no production
  default behavior.
- [SQLite `EXPLAIN` wording differs across supported versions] → Assert the
  required index identifier, not full planner output text.
- [In-memory SQLite has different locking/WAL behavior from file databases] →
  run the same contracts in both modes and reserve concurrency/lease behavior
  for adapter-specific tests when needed.

## Migration Plan

1. Extend the portable media-deletion command and in-memory parity double,
   keeping current publication/entry contracts compatible.
2. Add the Node specialized mutation implementation, deterministic IDs/fault
   hooks, and focused persistence tests against the existing 5A migration.
3. Add the reusable contract harness and run it in both Node SQLite modes,
   including query-plan fixtures.
4. Verify focused tests and root gates. Deployment requires the existing
   explicit migration command; this session adds no migration. Rollback is an
   application-package rollback because persisted rows remain schema-compatible
   and any pending outbox event is durable for later dispatch.
