## ADDED Requirements

### Requirement: Authentication-provider records preserve a validated Lace role
The schema SHALL persist provider-compatible `user`, `session`, `account`, and
`verification` records with unique user email and session token, foreign-key
account/session ownership, and the provider's required timestamps and
credential columns. The user record SHALL store a non-null Lace role limited to
`admin`, `editor`, or `viewer` and SHALL default the role to `viewer`. Schema
changes needed to meet this contract SHALL use ordered forward migrations and
SHALL NOT create duplicate authentication tables on a database that already
has a compatible baseline.

#### Scenario: New provider user has the least-privileged role
- **WHEN** the authentication provider persists a newly created user without a
  role supplied by a privileged Lace workflow
- **THEN** the database stores `viewer` as that user's role

#### Scenario: Invalid role is persisted
- **WHEN** a write attempts to persist a user role outside the Lace role set
- **THEN** the database rejects the write and leaves valid authentication data
unchanged
