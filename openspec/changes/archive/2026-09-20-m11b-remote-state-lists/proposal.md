## Why

Session 11A provides an accessible routed admin shell, but its authentication and
content routes still use static placeholders. Session 11B connects that shell to
the authenticated REST API so users can sign in, navigate actual configured
models, and manage collection entries safely.

This implements roadmap Step 11, Session 11B — Remote state and lists — while
preserving the single-site, code-first model and server-authoritative permission
boundaries in architecture sections 3, 4.3, and 5.

## What Changes

- Add a credentialed, schema-validating admin API client with a uniform error
  mapper that exposes the server request ID in technical error details.
- Replace placeholder content routes with remote model navigation: page models
  link to their singleton editor route and collection models display
  cursor-paginated entry lists.
- Add authenticated sign-in/sign-out, expired-session recovery, and explicit
  loading, empty, and error states for remote admin data.
- Add permission-aware collection-entry creation and deletion controls, while
  relying on the existing REST API for authorization.
- Define React Query keys and mutation invalidation so successful sign-in,
  sign-out, creation, and deletion refresh the affected session, model, and
  entry-list state.

## Capabilities

### New Capabilities

- `admin-remote-state-and-lists`: Credentialed admin remote-state behavior,
  login/logout recovery, model-driven navigation, paginated collection lists,
  and entry create/delete affordances.

### Modified Capabilities

- `admin-application-shell`: Replace Session 11A content and login placeholders
  with the Session 11B remote-state behavior while retaining its route and
  accessibility guarantees.

## Impact

- Affected code: `apps/admin` routes, session boundary, UI controls, tests, and
  a new admin client/query layer.
- Existing dependencies: shared `@lacecms/contracts` schemas, TanStack Router,
  TanStack Query, and the existing same-origin Better Auth and `/api/v1/admin/*`
  endpoints; no server contract or persistence changes are required.
- Non-goals: draft editing, block editing, publishing, media browsing, build
  history, and user/settings management remain in their roadmap sessions.
