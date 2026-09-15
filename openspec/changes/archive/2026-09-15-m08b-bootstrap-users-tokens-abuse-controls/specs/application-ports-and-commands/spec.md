## ADDED Requirements

### Requirement: Portable security lifecycle commands preserve guarded outcomes
The system SHALL expose portable, REST- and database-independent contracts for
setup-credential issuance and claim/completion, user lifecycle administration,
opaque build-credential issuance/verification/revocation, and fixed-window
rate-limit decisions. Commands SHALL encode their actor, time, lifecycle
guards, and complete outcome rather than accepting a generic transaction
callback or a persistence row. Persistence-facing values SHALL contain only
derived credential, email-subject, and rate-limit identifiers.

#### Scenario: A runtime adapter implements a security command
- **WHEN** a Node or Cloudflare adapter receives a portable setup, user, token,
or limiter command
- **THEN** it can enforce the documented guarded outcome without importing an
HTTP DTO or exposing a database row to application callers

