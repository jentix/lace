# configuration-synchronization Specification

## Purpose

Defines portable, non-mutating planning and reporting for reconciling the
code-first configuration model identities with persisted content-model state.

## Requirements

### Requirement: Synchronization planning classifies normalized model identities
The system SHALL derive a deterministic synchronization plan from normalized
configuration models and persisted model identity records that include kind,
version, structural hash, projection hash, and draft/published snapshot counts.
The plan SHALL order results by current model key and classify every affected
model as create, label-only update, compatible version update, explicit rename,
safe removal, blocked removal, or incompatible change. An unchanged model SHALL
not produce a planned write. A label-only update SHALL be limited to a
projection-hash change with an unchanged structural hash and version; a
compatible version update SHALL never regress a stored version or accept a
structural-hash change without a version increase.

#### Scenario: Planner identifies safe create and display update
- **WHEN** a normalized configuration adds a model that has no stored identity,
  or changes only the serializable display projection of an existing model
- **THEN** the plan contains respectively a deterministic create or label-only
  update operation and no invalid diagnostic

#### Scenario: Planner identifies an unchanged configuration
- **WHEN** every normalized model has the same key, kind, version, structural
  hash, and projection hash as its stored identity
- **THEN** the plan contains no operations and reports that no apply is needed

#### Scenario: Planner rejects an unsafe version or hash transition
- **WHEN** an existing model changes kind, regresses its version, or changes its
  structural hash without increasing its version
- **THEN** the plan is invalid, names the model and reason, and contains no
  executable operation for that transition

### Requirement: Synchronization planning protects stored content and requires explicit renames
The system SHALL treat a renamed model identity as a rename only when the
normalized model supplies `renamedFrom`, the former stored key exists, the new
stored key does not exist, and the former and new kinds are equal. It SHALL NOT
infer a rename from a removal and an addition. The planner SHALL mark a removal
as safe only when the stored model has no entries, and as blocked when it has
entries. It SHALL mark a structural change as incompatible when the model has
any draft or published snapshot. Ambiguous, missing, or conflicting rename
evidence SHALL make the plan invalid and SHALL identify every affected current
and former key.

#### Scenario: Explicit compatible rename preserves a populated model identity
- **WHEN** a new page or collection key supplies a valid `renamedFrom` key for
  an existing stored model of the same kind with entries
- **THEN** the plan contains one explicit rename operation rather than a create
  and removal, provided its structure is otherwise compatible with the stored
  snapshots

#### Scenario: Key replacement without a hint is blocked by existing entries
- **WHEN** a stored populated model disappears from configuration and a new
  model appears without a valid `renamedFrom` hint
- **THEN** the plan reports the create separately and marks the removal blocked
  without inferring a rename

#### Scenario: Empty model identity can be removed
- **WHEN** a stored model is absent from normalized configuration and has no
  entries
- **THEN** the plan contains one safe removal operation for its stored key

#### Scenario: Structural change is blocked for stored snapshots
- **WHEN** an existing model has draft or published snapshots and its normalized
  structural hash differs from the stored structural hash
- **THEN** the plan reports an incompatible change that names the affected
  snapshot states and does not permit an apply

### Requirement: Synchronization plans have stable human and machine reports
The system SHALL render a plan as deterministic human-readable text and as
JSON-safe data without executable values. Both representations SHALL preserve
the ordered operations, invalid diagnostics, affected model keys, and whether
an apply is required. Check mode SHALL be non-mutating and SHALL return a
non-zero outcome when the plan is invalid or contains one or more operations;
it SHALL return zero only for a valid no-op plan.

#### Scenario: Machine reports are stable across equivalent inputs
- **WHEN** equivalent stored records and normalized configuration are supplied
  in different insertion orders
- **THEN** the JSON report has the same ordered content and serializes to the
  same canonical result

#### Scenario: Check mode distinguishes no-op from pending or invalid work
- **WHEN** check mode receives respectively an unchanged valid configuration, a
  valid configuration requiring synchronization, and an invalid configuration
- **THEN** it returns respectively zero, non-zero, and non-zero without writing
  model, entry, snapshot, public-state, or outbox data

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
required model fields until publication. Collections SHALL NOT receive an entry
from synchronization. If one or more committed operations change a serializable
configuration projection visible to public consumers, the operation SHALL
increment the global published-state version and create or coalesce exactly one
pending site-build request for that version in the same atomic mutation.
Operations that do not change that public projection SHALL NOT advance the
version or enqueue build work.

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
