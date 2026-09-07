# ADR 0002: Use guarded D1 batches and interactive Node transactions

- Status: Accepted
- Date: 2026-09-07
- Governing architecture: [sections 4.5](../mvp-architecture.md#45-portable-capabilities-explicit-adapters), [9](../mvp-architecture.md#9-content-data-model), and [10](../mvp-architecture.md#10-content-publication)

## Context

Publication and draft mutations must atomically preserve snapshots, routes,
media references, published state, idempotency, and outbox invariants. Node
SQLite supports interactive callbacks; D1 provides atomic SQL batches.

## Decision

Application ports model known atomic content operations rather than a generic
transaction callback. Node implements them with interactive SQLite transactions.
D1 implements them as explicit guarded atomic SQL batches. Publication first
conditionally creates its snapshot only when the draft pointer and expected
revision match; all later copy, route, state, idempotency, outbox, and cleanup
statements are conditional on that guard. A zero-row guard returns
`CONTENT_REVISION_CONFLICT` and makes all following statements no-ops.

## Consequences

- Node and Cloudflare have identical observable publication semantics without
  pretending their transaction APIs are identical.
- Cross-runtime tests must cover commit, route-collision rollback, and revision
  conflicts.

## Alternatives considered

- A generic interactive transaction port was rejected because D1 cannot safely
  fulfill that promise.
- Unguarded writes after validation were rejected because concurrent drafts can
  publish stale content.
- Separate snapshot and outbox writes were rejected because they can leave
  public state without a rebuild request.
