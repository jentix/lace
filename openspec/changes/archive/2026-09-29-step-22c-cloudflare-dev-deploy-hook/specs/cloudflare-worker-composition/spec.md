## MODIFIED Requirements

### Requirement: Worker bindings and secrets are validated without disclosure
The Worker SHALL require a D1 binding, an R2 binding, an authentication secret,
and an absolute public base URL, and SHALL accept an optional KV cache binding,
an optional static-assets binding, an optional HTTPS deploy-hook URL secret, an
optional deploy-hook timeout from 1 to 60000 ms, an optional environment mode,
and an optional bounded storage timeout. It SHALL validate them once per isolate
before serving application traffic. When validation fails, API requests SHALL
receive a sanitized `503` error envelope and the Worker SHALL log only the names
of affected bindings or variables, never a supplied value.

#### Scenario: Valid bindings serve the API
- **WHEN** the Worker starts with valid required bindings and secrets
- **THEN** health, public, admin, and auth routes are served by the portable
  application backed by D1 and R2

#### Scenario: A required secret is missing
- **WHEN** the authentication secret or public base URL is absent or invalid
- **THEN** requests receive a sanitized `503` response and logs name only the
  affected variable

#### Scenario: Deploy-hook timeout is out of range
- **WHEN** the deploy-hook timeout is `0`, above `60000`, or not an integer
- **THEN** requests receive a sanitized `503` response and logs name only the
  deploy-hook timeout variable

### Requirement: Worker composition matches Node application behavior
The Worker SHALL compose the same portable application as Node: content, media,
build, and security capabilities backed by D1 and R2, D1 security persistence,
HMAC rate limiting keyed by the Cloudflare-provided client IP, and the
statically imported, normalized project configuration. No request SHALL select
or evaluate a configuration module. When a deploy-hook URL is configured, build
dispatch SHALL use the Cloudflare deploy-hook trigger. When no deploy-hook
trigger is configured, build dispatch SHALL record the same sanitized
trigger-unavailable failure as an unconfigured Node deployment.

#### Scenario: Same request gives the same response
- **WHEN** an authenticated admin creates, saves, and publishes an entry through
  the Worker and through Node with equal configuration
- **THEN** both return equal response contracts and enqueue one site-build event

#### Scenario: Deploy hook is configured
- **WHEN** a build event is dispatched by a Worker with a deploy-hook URL secret
- **THEN** the deploy hook is called and its mapped result is recorded on the
  build

#### Scenario: Deploy hook is absent
- **WHEN** a build event is dispatched by a Worker without a deploy-hook URL
- **THEN** the attempt is recorded as a sanitized `trigger_unavailable` failure
