## ADDED Requirements

### Requirement: Synchronization plans apply atomically against current persisted state
The system SHALL apply only a valid configuration synchronization plan through
one guarded atomic persistence operation that re-reads model identities and
entry/draft/published snapshot summaries before it writes. The operation SHALL
reject a plan that is invalid, no longer matches current stored state, or cannot
complete every planned operation, and SHALL leave model identities, entries,
snapshots, public state, and outbox work unchanged. A valid no-op plan SHALL
perform no writes. An explicit valid rename SHALL migrate the stored model key
and every dependent model foreign key atomically; the system SHALL NOT infer a
rename.

#### Scenario: Concurrent synchronization invalidates a stale plan
- **WHEN** one synchronization changes a model identity after another caller
  has planned but before that caller applies
- **THEN** the later caller rejects its stale plan without overwriting the
  committed identity or partially changing any related content

#### Scenario: Reapplying an unchanged configuration is idempotent
- **WHEN** a valid plan is applied and a new plan is produced from the same
  unchanged normalized configuration and persisted state
- **THEN** the new plan is a valid no-op and applying it performs no writes,
  public-version increment, or build request

### Requirement: Synchronization creates page singletons and advances public projection state
The system SHALL create one draft-only singleton entry for every newly created
page model in the same guarded atomic operation as its model identity. That
entry SHALL use the configured model defaults, an empty block list, a `NULL`
slug, the model label (or its stable key when no optional label is configured)
as its title, and `system:content-sync` as its audit actor; it MAY omit
required model fields until publication. Collections SHALL
NOT receive an entry from synchronization. If one or more committed operations
change a serializable configuration projection visible to public consumers, the
operation SHALL increment the global published-state version and create or
coalesce exactly one pending site-build request for that version in the same
atomic mutation. Operations that do not change that public projection SHALL
NOT advance the version or enqueue build work.

#### Scenario: New page receives one system draft
- **WHEN** synchronization creates a page model that has no persisted identity
- **THEN** it commits the model and exactly one singleton draft entry with the
  configured defaults, empty blocks, `NULL` slug, model-label title, and
  `system:content-sync` audit values

#### Scenario: Projection-changing apply coalesces build work
- **WHEN** an atomic synchronization applies one or more operations that change
  a public configuration projection while a pending unlocked site-build request
  exists
- **THEN** it increments published state once and leaves exactly one pending
  site-build request targeting the new version

#### Scenario: Failed page creation rolls back the identity update
- **WHEN** a new page model cannot create its singleton draft during
  synchronization
- **THEN** neither the model identity nor any public-state or outbox change is
  committed
