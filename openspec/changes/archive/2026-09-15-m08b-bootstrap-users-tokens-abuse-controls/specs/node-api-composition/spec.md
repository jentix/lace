## ADDED Requirements

### Requirement: Node composes persistent security controls without secret disclosure
The Node composition root SHALL provide the SQLite-backed implementations of
setup, user, build-token, and HMAC fixed-window rate-limit capabilities to the
portable HTTP application. It SHALL require any new cryptographic configuration
needed for HMAC projections, fail startup without revealing a supplied secret,
and use the configured UTC clock and ID generator at the security boundary.

#### Scenario: Node receives a configured sensitive operation
- **WHEN** a Node deployment receives setup, token-management, or
build-token-authenticated build-export traffic
- **THEN** it uses its persistent security capability and logs neither
plaintext token nor raw rate-limit subject

