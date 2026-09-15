## MODIFIED Requirements

### Requirement: Focused portable content commands and reads

The system SHALL expose application-level input and output contracts,
independent of REST DTOs and database rows, for planning normalized model
synchronization against portable stored-model identity and snapshot summaries;
dry-running and atomically applying a guarded approved synchronization plan;
creating an entry; loading an entry's draft or published aggregate; listing
model entries with an opaque cursor; atomically replacing a complete draft at
an expected revision; atomically publishing a guarded draft with an optional
idempotency key; deleting an entry with caller actor/time; marking unreferenced
media for asynchronous deletion; listing published entries for one supplied
collection model with an opaque cursor, resolving public content, loading media
that is publicly reachable; reading the current published-state version; and
exporting build content. The model-sync
planning and apply contracts SHALL expose ordered portable operations,
diagnostics, fresh-state guards, and complete outcomes without exposing a
database or generic transaction callback. A complete-draft command SHALL carry
the validated media-reference projection, including its stable source key,
field path, and media identity, rather than requiring an adapter to infer
references from arbitrary JSON. Read operations SHALL be separate from
state-changing operations. State-changing contracts SHALL encode their required
guards and complete result rather than accepting a generic cross-runtime
transaction callback. When a guarded publication supplies an idempotency key,
its command contract SHALL bind the key to the entry, authenticated actor, and
complete publication input and SHALL return the original completed publication
result for an identical retry without performing the publication again.

#### Scenario: A runtime adapter supplies portable entry data
- **WHEN** an application caller requests an entry aggregate, a cursor page for
  one collection's published entries, public data, public media, the current
  published-state version, or build export
- **THEN** the returned contract contains portable domain/configuration values
  and no HTTP, framework, or database-row type

#### Scenario: Model synchronization is planned without a persistence callback
- **WHEN** an application caller compares normalized configuration to portable
  stored-model and snapshot summaries
- **THEN** it receives the deterministic plan, diagnostics, and no-op/apply
  status without a database-row type or general transaction callback

#### Scenario: A guarded synchronization apply crosses runtimes
- **WHEN** an application caller supplies a valid synchronization plan and its
  fresh-state guard to a runtime adapter
- **THEN** the adapter returns a portable complete outcome or rejects the stale
  or invalid plan without exposing a database row or generic transaction
  callback

#### Scenario: A guarded content operation crosses runtimes
- **WHEN** a caller requests entry creation, full-draft save, publication,
  deletion, or later model-sync application
- **THEN** the command declares the guard and complete state change needed for
  one atomic persistence operation without exposing a general transaction
  callback

#### Scenario: Complete draft inputs identify media references
- **WHEN** application validation accepts media fields in snapshot fields or
  block data for a complete draft
- **THEN** the persistence command receives the media identities with `$fields`
  or the stable block key and their field paths, without inspecting arbitrary
  serialized values

#### Scenario: Cursor traversal has no transport dependency
- **WHEN** a caller lists entries for a model or published entries for one
  collection after receiving a continuation cursor
- **THEN** it can pass that opaque cursor back to the application contract and
  receive the next portable page without importing a REST schema

#### Scenario: A conditional export checks only its version
- **WHEN** a caller checks the current published-state version before deciding
  whether to load build-export content
- **THEN** it receives the portable non-negative version without loading the
  complete exported entries

#### Scenario: An identical publish retry is atomic
- **WHEN** an application caller retries guarded publication with the same entry,
  actor, idempotency key, and complete publication input
- **THEN** the command returns the original complete result without replacing the
  publication, changing the public export version, or requiring a second
  downstream build dispatch

#### Scenario: Published deletion persists supplied audit values
- **WHEN** an application caller deletes current published content
- **THEN** persistence receives the caller actor and application-clock time
