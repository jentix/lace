## ADDED Requirements

### Requirement: Batch mutation guards are transient schema records
The schema SHALL provide a mutation-guard table keyed by a non-null
batch-unique token with a creation timestamp, added by an ordered forward
migration compatible with SQLite and D1. A guard row SHALL exist only inside the
atomic batch that inserted it; every mutation that inserts a guard SHALL delete
it in the same batch, so committed state never retains a guard row. Node
SQLite transactions SHALL NOT require the table.

#### Scenario: Migrated database exposes the guard table
- **WHEN** an empty database applies all forward migrations
- **THEN** the mutation-guard table exists, a null token is rejected, and the
  installed migration list includes the new migration

#### Scenario: Committed state has no guard rows
- **WHEN** any D1 mutation batch commits, is a guarded no-op, or rolls back
- **THEN** the mutation-guard table contains no rows afterwards
