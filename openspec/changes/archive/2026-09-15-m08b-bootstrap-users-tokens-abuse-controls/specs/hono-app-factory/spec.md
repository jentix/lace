## ADDED Requirements

### Requirement: Setup, security administration, and build export have distinct HTTP boundaries
The HTTP application SHALL expose setup-admin only while setup remains
incomplete, resolve an administrator actor for user and build-token
administration, and accept a build credential only at build export. It SHALL
run the applicable rate-limit check before setup, authentication, token, or
upload work; an exhausted result SHALL return the shared `RATE_LIMITED` error
with `Retry-After`. Route handlers SHALL pass portable commands and actors to
the supplied boundaries and SHALL NOT query persistence or compare role
strings.

#### Scenario: A build credential is used at an admin route
- **WHEN** a caller supplies a valid build credential to an administrative
user or token-management route
- **THEN** the route denies the request because build credentials do not
provide a browser actor

