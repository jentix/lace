# application-ports-and-commands Specification

## Purpose

Defines portable application contracts and in-memory test behavior that give
later use cases and both runtime adapters one consistent atomic content boundary.

## Requirements

### Requirement: Focused portable content commands and reads

The system SHALL expose application-level input and output contracts,
independent of REST DTOs and database rows, for planning normalized model
synchronization against portable stored-model identity and snapshot summaries;
dry-running and atomically applying a guarded approved synchronization plan;
creating an entry; loading an entry's draft or published
aggregate; listing model entries with an opaque cursor; atomically replacing a
complete draft at an expected revision; atomically publishing a guarded draft
with an optional idempotency key; deleting an entry with caller actor/time;
marking unreferenced media for asynchronous deletion; listing and resolving
public content; loading media that is publicly reachable; and exporting build content.
The model-sync planning and apply contracts SHALL expose ordered portable
operations, diagnostics, fresh-state guards, and complete outcomes without
exposing a database or generic transaction callback.
A complete-draft command SHALL carry the validated media-reference projection,
including its stable source key, field path, and media identity, rather than
requiring an adapter to infer references from arbitrary JSON. Read operations
SHALL be separate from state-changing operations. State-changing contracts SHALL
encode their required guards and complete result rather than accepting a generic
cross-runtime transaction callback. When a guarded publication supplies an
idempotency key, its command contract SHALL bind the key to the entry,
authenticated actor, and complete publication input and SHALL return the
original completed publication result for an identical retry without performing
the publication again.

#### Scenario: A runtime adapter supplies portable entry data
- **WHEN** an application caller requests an entry aggregate, a cursor page,
  public data, public media, or build export
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
- **WHEN** a caller lists entries for a model after receiving a continuation cursor
- **THEN** it can pass that opaque cursor back to the application contract and receive the next portable page without importing a REST schema

#### Scenario: An identical publish retry is atomic
- **WHEN** an application caller retries guarded publication with the same entry,
  actor, idempotency key, and complete publication input
- **THEN** the command returns the original complete result without replacing the
  publication, changing the public export version, or requiring a second
  downstream build dispatch

#### Scenario: Published deletion persists supplied audit values
- **WHEN** an application caller deletes current published content
- **THEN** persistence receives the caller actor and application-clock time

### Requirement: Portable infrastructure capability boundaries

The system SHALL expose portable capability contracts for binary object storage,
derived caching, site-build triggering, UTC clock reads, unique ID generation,
password-safe opaque-token hashing and verification, and dispatcher-event lease
claiming/completion. Object storage SHALL keep binary data outside the content
database contract. Cache values SHALL be non-authoritative, so a cache miss,
eviction, or delayed invalidation SHALL not alter correct content results. Token
contracts SHALL accept secrets only for hashing or verification and SHALL expose
only a derived verifier for persistence. Lease contracts SHALL identify a bounded
claim, lease expiry, and completion/failure outcome so concurrent dispatchers do
not process one event as separate successful work.

#### Scenario: Cache is unavailable
- **WHEN** a cache capability misses, is evicted, or returns no value
- **THEN** callers can continue from the authoritative content capability and preserve correct content behavior

#### Scenario: A token is stored safely
- **WHEN** a caller creates an opaque build or API token verifier
- **THEN** persistence receives a password-safe derived verifier rather than the plaintext token

#### Scenario: Concurrent dispatchers claim work
- **WHEN** two dispatcher instances attempt to claim the same available event
- **THEN** the lease capability grants it to at most one active lease until that lease expires or is completed

### Requirement: In-memory parity doubles preserve content invariants

The system SHALL provide in-memory application test doubles for the content,
infrastructure, and dispatch capability contracts. The content double SHALL
enforce page singleton cardinality, expected-revision conflicts, globally unique
published routes, exactly one mutable draft per committed entry, and detached
immutable publications. It SHALL make a complete draft save and a guarded
publication appear atomically: failures SHALL leave all stored aggregates,
routes, and public projections unchanged. Returned aggregates and projections
SHALL be detached from future caller mutation.

#### Scenario: A competing page creation is rejected
- **WHEN** an in-memory content double receives a second successful-create request for the same page model
- **THEN** it rejects the request with the stable page-cardinality conflict and retains the original entry unchanged

#### Scenario: Publication retains the previous public value after a draft edit
- **WHEN** an in-memory content double publishes an entry and subsequently saves a changed draft
- **THEN** public reads and build export retain the detached published snapshot while the draft receives exactly one revision increment

#### Scenario: A route conflict does not partially publish
- **WHEN** guarded publication resolves to a route owned by another entry
- **THEN** it rejects the request with the stable route-conflict failure and leaves the candidate draft, existing route owner, and all public projections unchanged
