## Why

The Node API currently resolves every production request as anonymous, even
though content use cases already enforce permissions on a supplied actor. Step
8 must establish the browser-session boundary that turns a validated Better
Auth session into that actor, without adding the bootstrap, user-management, or
automation-token work reserved for Session 8B.

## What Changes

- Implement roadmap Step 8, Session 8A: configure Better Auth email/password
  authentication with public self-sign-up disabled and persist its session data
  through the existing SQLite/Drizzle-compatible provider tables.
- Add an auth adapter that validates a session and its persisted role, then
  maps it to the application `Actor`; users created by the provider receive the
  `viewer` default role.
- Mount Better Auth below `/api/auth/*` before fallback routes, and require a
  resolved session only on protected API paths. Public content and health paths
  remain unauthenticated.
- Set same-origin cookie, origin/CSRF, trusted-origin, and production
  secure-cookie policy through explicit runtime configuration.
- Replace the production anonymous/test actor composition with the auth
  adapter. Existing routes continue to request permissions through use cases;
  no HTTP handler gains role-string checks.
- Add focused tests for sign-up rejection, session-to-actor mapping, protected
  versus public routing, origin rejection, and production cookie flags.

## Capabilities

### New Capabilities

- `authentication-and-actor-boundary`: Browser authentication and the
  translation of validated sessions into permission-checked application actors.

### Modified Capabilities

- `hono-app-factory`: Establish which API paths mount authentication and which
  paths require an authenticated actor.
- `node-api-composition`: Replace the production anonymous actor resolver with
  configured Better Auth composition.
- `sqlite-schema-and-migrations`: Specify Better Auth provider tables and their
  role persistence as a forward-compatible schema contract.

## Impact

This change affects `@lacecms/auth`, `@lacecms/db`, `@lacecms/server`,
`@lacecms/platform-node`, and `@lacecms/app-api`, plus the package catalog and
lockfile for Better Auth. It follows architecture sections 4.5 and 5 and the
same-origin deployment model in section 5; it deliberately excludes Session
8B setup tokens, user administration, opaque build tokens, and rate limits.

The current baseline migration already contains provider-shaped `user`,
`session`, `account`, and `verification` tables with a checked `viewer` role.
Implementation will validate that shape against Better Auth 1.7.3 and will not
create duplicate tables; a forward migration is added only if compatibility
requires a material schema adjustment.
