## ADDED Requirements

### Requirement: Authentication routes and protected routes have separate boundaries
The system SHALL dispatch `/api/auth/*` to the configured authentication
provider before catch-all API and admin-asset fallback routes. It SHALL resolve
an actor only for protected routes and SHALL leave health endpoints and
documented public content routes unauthenticated. Route handlers SHALL pass
the resolved actor to application use cases, which retain responsibility for
permission checks; handlers SHALL NOT compare role strings.

#### Scenario: Authentication route is not masked
- **WHEN** a request targets a known authentication-provider route below
  `/api/auth/`
- **THEN** the provider handles it rather than an API catch-all or admin asset
  responder

#### Scenario: Public route remains anonymous
- **WHEN** an unauthenticated caller requests a documented public content or
  health route
- **THEN** it receives that route's normal response without an actor-resolution
  attempt

#### Scenario: Protected route delegates authorization
- **WHEN** a validated editor requests an admin mutation that requires a
  permission the editor lacks
- **THEN** the route passes the actor to the application boundary and returns
  its shared authorization failure without comparing the role in the handler
