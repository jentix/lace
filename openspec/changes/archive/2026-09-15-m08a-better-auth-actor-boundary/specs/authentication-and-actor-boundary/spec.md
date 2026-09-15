## Purpose

Defines secure browser-session authentication and its narrow conversion into
Lace actors, so every protected operation receives a validated identity and
role without duplicating authorization policy in HTTP handlers.

## ADDED Requirements

### Requirement: Email/password authentication is closed to public enrollment
The system SHALL provide email/password browser authentication at `/api/auth/*`
and SHALL reject public sign-up attempts. It SHALL create no user, account, or
session as a result of a rejected public sign-up. Session and credential
material SHALL be managed by the authentication provider and SHALL not be
included in Lace API logs or error responses.

#### Scenario: Public sign-up is attempted
- **WHEN** an unauthenticated client calls the provider's email sign-up route
- **THEN** the request is rejected and no new user, credential account, or
  authenticated session is created

#### Scenario: Existing user signs in
- **WHEN** a user with a valid email/password credential calls the provider's
  sign-in route from a trusted origin
- **THEN** the response establishes the provider session according to its
  cookie policy without exposing the credential verifier

### Requirement: A validated session supplies the complete application actor
The system SHALL resolve a protected request's actor only from a validated,
unexpired session whose user record contains a valid Lace role. It SHALL map
the persisted user identifier and role to the application actor and SHALL deny
the protected request when the session is absent, invalid, expired, or joined
to an invalid role. A newly created provider user SHALL receive the `viewer`
role unless an authorized future workflow changes it.

#### Scenario: Session resolves as viewer
- **WHEN** a valid authenticated session belongs to a user persisted with the
  `viewer` role
- **THEN** a protected use case receives an actor with that user identifier and
  the `viewer` role

#### Scenario: Invalid session or role is presented
- **WHEN** a protected request has no valid session or its resolved user role is
  absent or outside `admin`, `editor`, and `viewer`
- **THEN** the request is denied before application content work runs

### Requirement: Same-origin browser session protections are explicit
The authentication boundary SHALL use the configured canonical public origin as
its trusted origin and SHALL reject untrusted browser origins for
cookie-authenticated mutations. It SHALL retain CSRF and origin protection,
use same-origin session cookies, and mark session cookies `Secure` in
production. It SHALL not disable the provider's CSRF or origin checks.

#### Scenario: Cross-origin browser mutation is attempted
- **WHEN** a browser-originated authentication mutation names an origin outside
  the configured trusted origin set
- **THEN** the request is rejected before it can create or alter authentication
  state

#### Scenario: Production session is created
- **WHEN** production configuration establishes an authentication session
- **THEN** its session cookie is marked `Secure` and remains scoped to the
  configured same-origin deployment
