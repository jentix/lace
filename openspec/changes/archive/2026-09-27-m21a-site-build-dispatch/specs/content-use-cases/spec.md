## MODIFIED Requirements

### Requirement: Publication is guarded, idempotent, and build-independent
The system SHALL publish only after strict validation and shall resolve the
candidate public route before invoking one guarded atomic publication operation.
The operation SHALL use the caller's expected draft revision, a new publication
snapshot identity, and the application clock time. A conflicting route,
singleton, or stale revision SHALL fail without a partial publication. A
non-empty idempotency key scoped to the same content entry and authenticated
actor SHALL return the original successful publication result when retried and
MUST NOT create another published snapshot, increment public content version,
or enqueue another build event. Reusing that scope/key with materially different
publication input SHALL fail without changing content. Successful publication
SHALL atomically enqueue or coalesce durable build work and report a queued
build outcome with the target version; a replay SHALL report that no new work
was queued. Trigger acceptance, failure, or unavailability after commit SHALL
not undo, obscure, or retry the successful publication.

#### Scenario: Route conflict leaves published content untouched
- **WHEN** a publish candidate resolves to a route owned by a different entry
- **THEN** publication fails with the stable route-conflict error and neither
  entry's public snapshot, route ownership, or public content version changes

#### Scenario: Retry returns a publication once
- **WHEN** a publisher retries an already successful publication with the same
  entry, actor, idempotency key, and input
- **THEN** it receives the original publication result, the existing published
  snapshot remains current, and no additional build event is enqueued

#### Scenario: Build dispatch failure does not roll back publication
- **WHEN** guarded publication succeeds and the subsequent build trigger rejects
  or throws for the resulting public version
- **THEN** the use case has already reported publication as successful with a
  queued build outcome, and public reads return the new immutable snapshot
