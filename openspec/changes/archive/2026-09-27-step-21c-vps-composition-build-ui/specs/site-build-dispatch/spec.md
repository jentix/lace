## ADDED Requirements

### Requirement: Authenticated actors can inspect build history
Authenticated admin, editor, and viewer actors SHALL be able to read bounded newest-first site-build history and individual build detail. Each record SHALL include reason, status, target version, requester, request/start/completion times when applicable, provider ID when applicable, and only sanitized error text. Read operations SHALL not change build state. Only administrators SHALL retain request and retry permissions.

#### Scenario: Builds exist
- **WHEN** an authenticated actor requests build history or a known build detail
- **THEN** the response contains persisted lifecycle data in newest-first history order and does not expose secrets or raw command output

#### Scenario: Unknown build
- **WHEN** an authenticated actor requests a missing build ID
- **THEN** the service returns not found without changing the queue

#### Scenario: Anonymous reader
- **WHEN** an unauthenticated caller requests build history
- **THEN** access is denied
