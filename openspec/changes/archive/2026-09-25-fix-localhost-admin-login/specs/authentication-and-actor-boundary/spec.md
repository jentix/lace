## MODIFIED Requirements

### Requirement: Same-origin browser session protections are explicit
The authentication boundary SHALL use the configured canonical public origin as
its trusted origin and SHALL reject untrusted browser origins for
cookie-authenticated mutations. In local development only, when that origin
uses `localhost` or `127.0.0.1`, the boundary SHALL also trust the other
loopback hostname with the same scheme and port. It SHALL retain CSRF and
origin protection, use same-origin session cookies, and mark session cookies
`Secure` in production. It SHALL not disable the provider's CSRF or origin
checks or extend loopback aliases to production or non-loopback origins.

#### Scenario: Cross-origin browser mutation is attempted
- **WHEN** a browser-originated authentication mutation names an origin outside
  the configured trusted origin set
- **THEN** the request is rejected before it can create or alter authentication
  state

#### Scenario: Production session is created
- **WHEN** production configuration establishes an authentication session
- **THEN** its session cookie is marked `Secure` and remains scoped to the
  configured same-origin deployment

#### Scenario: Local admin uses the alternate loopback hostname
- **WHEN** local development is configured for `127.0.0.1` and a valid user
  signs in through `localhost` on the same scheme and port, or vice versa
- **THEN** the provider accepts the request and establishes a browser session

#### Scenario: A production or remote origin uses a loopback alias
- **WHEN** a production deployment or a non-loopback development deployment
  receives an authentication mutation from an unconfigured loopback hostname
- **THEN** the provider rejects the origin
