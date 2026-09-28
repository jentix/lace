# content-repository-contracts Specification

## Purpose

Defines reusable persistence contracts that prove lifecycle invariants across database runtimes.

## Requirements

### Requirement: Repository contract fixtures preserve lifecycle invariants
The system SHALL provide a reusable, factory-driven repository contract suite
with deterministic fixtures for cardinality, revision guards, route conflict
and rollback, immutable publications, idempotency, projections, cascades,
outbox coalescing, dispatcher leases, site-build transitions, configuration
synchronization, media catalog and usage, and cursor ordering. A runtime
adapter SHALL participate only by supplying a factory for a freshly migrated
database, its repository, a second independent repository over the same
database, and parameterized SQL seeding/inspection; the cases themselves SHALL
be identical for every runtime.

#### Scenario: SQLite modes conform
- **WHEN** contracts run against migrated file-backed and in-memory SQLite
- **THEN** both modes satisfy all lifecycle assertions

#### Scenario: Local D1 conforms
- **WHEN** the same contract cases run against a migrated local D1 database
- **THEN** every case passes without a D1-specific case variant or skipped
  assertion

#### Scenario: Independent writers conflict deterministically
- **WHEN** two repositories over the same database save complete drafts at the
  same expected revision, or publish with the same idempotency key
- **THEN** the suite observes exactly one committed save and one stable revision
  conflict, or one committed publication and one replay, in every runtime

### Requirement: Repository contract fixtures verify atomicity and indexes
The system SHALL inject mutation failures and inspect query plans for route, block, media-reference, entry-list, and outbox lookups.

#### Scenario: Failed checkpoint rolls back
- **WHEN** a configured mutation checkpoint throws
- **THEN** no partial aggregate or public projection remains

#### Scenario: Critical lookups use indexes
- **WHEN** representative queries are explained
- **THEN** each plan names its required index

#### Scenario: Injected D1 failure happens inside the batch
- **WHEN** a D1 mutation checkpoint is configured to fail
- **THEN** the failure is raised by a statement executing within the mutation's
  batch after earlier statements ran, and none of their effects remain
