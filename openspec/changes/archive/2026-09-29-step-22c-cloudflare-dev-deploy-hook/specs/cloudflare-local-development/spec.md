## Purpose

Defines the local Cloudflare integration workflow, the explicit local and
remote D1 migration command, and the smoke checks that prove the built Worker
bundle serves the product flow under workerd.

## ADDED Requirements

### Requirement: Cloudflare development runs the product behind one origin
`pnpm dev:cloudflare` SHALL run the Worker locally under workerd with local-only
D1 and R2 bindings, the admin development server, and the Astro development
server behind one local HTTP origin. Requests to `/api`, `/api/*`, `/health`,
and `/health/*` SHALL reach the Worker; `/admin` and `/admin/*` SHALL reach the
admin development server; all other paths SHALL reach the site development
server, including development WebSocket upgrades for the admin and site. The
Worker SHALL receive that origin as its public base URL and SHALL run in
development mode. A KV cache binding SHALL be added only when explicitly
requested.

#### Scenario: Admin signs in through the gateway
- **WHEN** a browser loads `/admin/` from the development origin and signs in
- **THEN** admin and API requests are same-origin and the session cookie is
  accepted by later API requests

#### Scenario: API paths never reach a frontend server
- **WHEN** a request targets `/api/v1/unknown` on the development origin
- **THEN** the Worker returns its API `404` envelope

### Requirement: Local Cloudflare state persists in the ignored development directory
Local D1 and R2 data, the generated development Worker configuration, and the
local authentication secret SHALL live under the git-ignored `dev-data/cloudflare`
directory. The authentication secret SHALL be generated once with owner-only
file permissions and reused on later runs. Before starting the Worker, the
workflow SHALL apply pending local migrations, synchronize the project
configuration into local D1, and, while first-admin setup is still open, print
one new setup token.

#### Scenario: Development restarts
- **WHEN** `pnpm dev:cloudflare` is stopped and started again
- **THEN** previously created users, entries, media, and sessions remain and no
  new setup token is printed after setup completed

#### Scenario: First run
- **WHEN** `pnpm dev:cloudflare` runs with no local state
- **THEN** local D1 is migrated and synchronized and a one-time setup token is
  printed

### Requirement: D1 migrations require an explicit target
`pnpm db:migrate:cloudflare` SHALL require exactly one of `--local` or
`--remote` and SHALL reject no target, both targets, or unknown arguments
without running a migration. Local migration SHALL apply the checked-in
migrations to the same persisted local state that `dev:cloudflare` uses.
Remote migration SHALL refuse a placeholder database ID. Outside CI, remote
migration SHALL require the operator to type the configured D1 database name at
an interactive prompt and SHALL refuse a non-interactive shell; inside CI it
SHALL proceed without a prompt.

#### Scenario: Target is omitted
- **WHEN** an operator runs `pnpm db:migrate:cloudflare` without a target
- **THEN** the command exits non-zero with usage and applies nothing

#### Scenario: Remote confirmation does not match
- **WHEN** an operator outside CI runs a remote migration and types a different
  name
- **THEN** the command exits non-zero and applies nothing

#### Scenario: Remote migration in CI
- **WHEN** `CI` is set and a remote migration runs with a real database ID
- **THEN** migrations are applied without an interactive prompt

### Requirement: Worker bundle passes product smoke checks
The Wrangler-built Worker bundle SHALL be exercised under workerd with D1
migrated by the local migration command, R2, static admin assets, and an
intercepted deploy hook. The smoke checks SHALL cover live and ready health,
first-admin setup and sign-in, image upload stored in R2, entry publication,
scheduled dispatch reaching the deploy hook and recording its provider ID,
authenticated build export containing the published entry, and static admin
fallback for client routes.

#### Scenario: Published entry reaches the deploy hook
- **WHEN** an entry is published through the bundle and a scheduled invocation
  runs after the build debounce
- **THEN** the deploy hook received one `POST` and the build is running with the
  returned provider ID

#### Scenario: Build export is authenticated
- **WHEN** the build export is requested without and then with a build token
- **THEN** the first request is rejected and the second returns the published
  entry
