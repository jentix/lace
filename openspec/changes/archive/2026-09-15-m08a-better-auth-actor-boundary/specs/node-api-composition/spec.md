## ADDED Requirements

### Requirement: Node production composition uses configured browser authentication
The Node composition root SHALL construct the authentication provider from its
validated public origin, secret, SQLite connection, and production mode, and
shall provide its actor resolver and route handler to the portable HTTP app. It
SHALL fail before serving traffic when required authentication configuration is
missing or invalid, without disclosing secret values. It SHALL retain the
test-only actor source exclusively for test fixtures and SHALL not use the
anonymous resolver as the default production composition.

#### Scenario: Production runtime resolves a session actor
- **WHEN** a configured Node production runtime receives a protected request
  carrying a valid provider session
- **THEN** it resolves the associated persisted actor and dispatches the
  protected route with that actor

#### Scenario: Authentication secret is invalid or missing
- **WHEN** Node startup lacks the required authentication secret or receives an
  invalid authentication-origin configuration
- **THEN** startup fails before binding and its diagnostic names only the
  affected configuration key, never its supplied secret value
