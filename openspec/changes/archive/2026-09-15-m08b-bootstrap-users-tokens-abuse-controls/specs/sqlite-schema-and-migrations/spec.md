## ADDED Requirements

### Requirement: Security state supports atomic first-admin and bounded lookup decisions
The schema SHALL persist singleton installation completion state, expiring
setup-credential claims, opaque build-credential metadata and revocation, and
fixed-window rate-limit buckets. It SHALL enforce one installation singleton
and unique setup/build verifiers, and SHALL index the active-user,
token-verifier, and bucket-key lookups required to enforce first-admin,
last-admin, credential verification, and rate-limit decisions without an
unbounded scan. Any new schema representation SHALL be added by an ordered
forward migration compatible with SQLite and D1.

#### Scenario: Concurrent last-admin checks run
- **WHEN** competing transactions attempt to disable or demote active
administrators
- **THEN** the persisted guarded operation leaves at least one active
administrator and does not rely on an unbounded user-table scan

