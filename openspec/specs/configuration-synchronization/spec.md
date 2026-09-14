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
