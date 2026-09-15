## ADDED Requirements

### Requirement: Security administration contracts reveal secrets only once
The shared REST contracts SHALL validate setup-admin, user list/create/update,
and build-token lifecycle requests and responses. A token-creation response
SHALL contain the plaintext credential exactly once; all later representations
SHALL exclude it and contain only safe token metadata. Rate-limit responses
SHALL use the shared error envelope with code `RATE_LIMITED` and a positive
integer `Retry-After` header.

#### Scenario: Token metadata is listed
- **WHEN** a client validates a build-token list or revocation response
- **THEN** the representation contains its identifier, name, prefix,
capabilities, lifecycle timestamps, and never the plaintext credential or its
stored verifier

