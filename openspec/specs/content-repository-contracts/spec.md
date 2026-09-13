# content-repository-contracts Specification

## Purpose

Defines reusable persistence contracts that prove lifecycle invariants across database runtimes.

## Requirements

### Requirement: Repository contract fixtures preserve lifecycle invariants
The system SHALL provide reusable contract fixtures for cardinality, revision guards, route rollback, immutable publications, idempotency, projections, cascades, outbox coalescing, and cursor ordering.

#### Scenario: SQLite modes conform
- **WHEN** contracts run against migrated file-backed and in-memory SQLite
- **THEN** both modes satisfy all lifecycle assertions

### Requirement: Repository contract fixtures verify atomicity and indexes
The system SHALL inject mutation failures and inspect query plans for route, block, media-reference, entry-list, and outbox lookups.

#### Scenario: Failed checkpoint rolls back
- **WHEN** a configured mutation checkpoint throws
- **THEN** no partial aggregate or public projection remains

#### Scenario: Critical lookups use indexes
- **WHEN** representative queries are explained
- **THEN** each plan names its required index
