## Purpose

Defines reusable persistence contracts that prove every repository adapter
preserves Lace content lifecycle invariants across supported database runtimes.

## ADDED Requirements

### Requirement: Repository contract fixtures prove lifecycle invariants across database modes
The system SHALL provide a reusable repository contract suite and deterministic
fixtures that can execute against each supported persistence adapter in both
temporary-file and in-memory SQLite modes where those modes are supported. The
suite SHALL assert page cardinality, expected-revision guards, route rollback,
published-snapshot immutability, publication idempotency, media-reference
projection behavior, entry/snapshot cascades, build-outbox coalescing, and
stable cursor ordering. A conforming adapter SHALL not pass merely because an
in-memory parity double passes.

#### Scenario: The Node adapter conforms in file-backed and in-memory SQLite
- **WHEN** the repository contracts run against freshly migrated temporary-file
  SQLite and separately against a freshly migrated in-memory SQLite connection
- **THEN** both modes satisfy every lifecycle, projection, cascade, outbox, and
  cursor assertion

#### Scenario: Fault injection proves transaction atomicity
- **WHEN** a contract injects a failure at each supported draft-save,
  publication, deletion, or media-deletion transaction checkpoint
- **THEN** each failed operation leaves either its complete prior state or its
  complete committed result, never a partial aggregate or public projection

### Requirement: Repository contract fixtures verify indexed critical query paths
The repository contract suite SHALL include deterministic `EXPLAIN QUERY PLAN`
fixtures for canonical published-route lookup, snapshot block ordering,
media-reference reverse lookup, model entry listing, and available-outbox work.
Each fixture SHALL verify use of the architecture-required index rather than
relying on incidental table order.

#### Scenario: Critical persistence lookups use declared indexes
- **WHEN** the contract executes the representative route, block-order,
  media-use, entry-list, and outbox queries on a migrated database
- **THEN** every query plan identifies its corresponding declared index
