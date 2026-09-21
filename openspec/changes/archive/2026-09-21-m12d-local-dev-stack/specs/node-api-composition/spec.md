## MODIFIED Requirements

### Requirement: Node development preserves a same-origin browser boundary

The `dev:node` workflow SHALL start or coordinate the documented complete local
Node development stack and serve API and health namespaces from the Node
application while proxying configured admin and site development traffic through
that same browser origin. It SHALL preserve development-server upgrade traffic
needed by the supported frontend development workflow. It SHALL not proxy
`/api/*`, `/health/live`, or `/health/ready` to an admin or site development
server, and it SHALL fail clearly when a configured development upstream is
invalid or unavailable.

#### Scenario: Browser API requests remain local to the Node API
- **WHEN** a browser uses the `dev:node` origin for an API or health request
- **THEN** that request reaches the Node application rather than either
development upstream

#### Scenario: A frontend development connection crosses the gateway
- **WHEN** an admin or site development server uses its supported development
upgrade connection through the `dev:node` origin
- **THEN** the gateway preserves that connection to the configured frontend
upstream without treating it as an API request

#### Scenario: A configured frontend upstream is unavailable
- **WHEN** a browser requests an admin or site route and its configured
development server is unavailable
- **THEN** the gateway returns a sanitized unavailable response and does not
forward the request to the other frontend or API namespace
