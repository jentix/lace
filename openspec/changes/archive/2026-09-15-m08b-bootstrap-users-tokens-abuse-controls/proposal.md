## Why

Step 8A established the browser-session boundary, but an installation still has
no safe way to create its first administrator, administer users, issue a
build-only credential, or resist repeated sensitive requests. Session 8B
completes the authentication and authorization vertical slice required before
the admin UI, media uploads, and build service are introduced.

## What Changes

- Implement roadmap Step 8, Session 8B: a one-time, expiring setup-token
  bootstrap protocol that creates exactly one initial administrator, survives a
  same-email retry, refuses a competing email claim, and disappears after
  completion.
- Add admin-only user list/create/disable/role-change behavior for the MVP
  `/users` route, including last-active-admin protection.
- Add issuance, one-time reveal, hash-only storage, verification, usage
  tracking, and revocation of a `content:build:read` opaque build token; only
  build export may accept it.
- Add portable SQL fixed-window rate limiting for authentication, setup,
  token-management, and the future upload route. Bucket identities are HMAC
  projections of sensitive subjects, and exhausted requests receive `429` with
  `Retry-After`.
- Extend runtime-validated REST contracts, Node composition, and the Hono app
  only where necessary to expose the setup, user, token, and build-export
  boundary without leaking persistence rows or secrets.

## Capabilities

### New Capabilities

- `bootstrap-user-token-abuse-controls`: Secure first-admin bootstrap,
  administrative user lifecycle, build-token lifecycle, and portable
  fixed-window abuse controls.

### Modified Capabilities

- `authentication-and-actor-boundary`: Specify setup and administrative-user
  authorization boundaries alongside the existing browser session boundary.
- `application-ports-and-commands`: Add portable ports and commands for setup,
  users, opaque build tokens, and rate-limit decisions.
- `hono-app-factory`: Define route precedence and authorization behavior for
  setup, user/token administration, and token-authenticated build export.
- `node-api-composition`: Compose the Node implementations of the new security
  capabilities and preserve safe runtime behavior.
- `rest-contracts`: Add validated setup, user, token, and rate-limit transport
  representations and their stable error behavior.
- `sqlite-schema-and-migrations`: Define the required installation, setup,
  token, and rate-limit persistence invariants and their query support.

## Impact

The change affects `@lacecms/application`, `@lacecms/auth`, `@lacecms/contracts`,
`@lacecms/db`, `@lacecms/platform-node`, `@lacecms/server`, and `apps/api`, plus
their focused tests and the generated OpenAPI artifact if public contracts
change. It relies on the Step 8A Better Auth boundary and pre-existing baseline
tables, and follows architecture sections 4.5, 5, 12, 14, and 15 and roadmap
Session 8B. It excludes media upload handling, the admin UI, recovery/email
flows, Cloudflare composition, arbitrary API-token capabilities, and a general
scheduled-cleanup implementation; those remain later roadmap work.
