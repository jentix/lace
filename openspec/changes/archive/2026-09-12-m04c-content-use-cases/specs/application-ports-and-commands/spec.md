## MODIFIED Requirements

### Requirement: Focused portable content commands and reads

The system SHALL expose application-level input and output contracts, independent
of REST DTOs and database rows, for inspecting and applying normalized model
synchronization; creating an entry; loading an entry's draft or published
aggregate; listing model entries with an opaque cursor; atomically replacing a
complete draft at an expected revision; atomically publishing a guarded draft
with an optional idempotency key; deleting an entry; listing public content; and
exporting build content. Read operations SHALL be separate from state-changing
operations. State-changing contracts SHALL encode their required guards and
complete result rather than accepting a generic cross-runtime transaction
callback. When a guarded publication supplies an idempotency key, its command
contract SHALL bind the key to the entry, authenticated actor, and complete
publication input and SHALL return the original completed publication result for
an identical retry without performing the publication again.

#### Scenario: A runtime adapter supplies portable entry data
- **WHEN** an application caller requests an entry aggregate, a cursor page, public data, or build export
- **THEN** the returned contract contains portable domain/configuration values and no HTTP, framework, or database-row type

#### Scenario: A guarded content operation crosses runtimes
- **WHEN** a caller requests entry creation, full-draft save, publication, deletion, or model-sync application
- **THEN** the command declares the guard and complete state change needed for one atomic persistence operation without exposing a general transaction callback

#### Scenario: Cursor traversal has no transport dependency
- **WHEN** a caller lists entries for a model after receiving a continuation cursor
- **THEN** it can pass that opaque cursor back to the application contract and receive the next portable page without importing a REST schema

#### Scenario: An identical publish retry is atomic
- **WHEN** an application caller retries guarded publication with the same entry,
  actor, idempotency key, and complete publication input
- **THEN** the command returns the original complete result without replacing the
  publication, changing the public export version, or requiring a second
  downstream build dispatch
