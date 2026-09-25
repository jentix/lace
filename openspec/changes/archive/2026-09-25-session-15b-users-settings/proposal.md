## Why

Step 15 Session 15B requires usable browser administration for access and local settings. The Users and Settings routes are placeholders even though the API already supports user and build-token operations. The `/admin/` entry route also renders 404.

## What Changes

- Replace Users and Settings placeholders with administrator-only, API-backed workflows, including clear loading, empty, success, and error states.
- Expose a small read-only settings status with readiness and configured-model count for local operators.
- Show build-token plaintext only at creation, provide metadata listing and revocation, and clear the secret from transient UI state when dismissed or leaving Settings.
- Provide a prominent logout action in the admin shell and redirect `/admin/` to `/admin/content`, subject to the existing session guard.

Scope: Session 15B and its directly related admin navigation fixes. Non-goals: Builds history, deployment settings, new roles, password reset, or token scopes beyond build read access. Existing user and token API behavior is the dependency.

## Capabilities

### New Capabilities

- `admin-users-and-settings`: Browser user, status, and build-token workflows with safe feedback and role affordances.

### Modified Capabilities

- `admin-application-shell`: Root admin redirect and visible logout in the shell.
- `hono-app-factory`: Administrator-only read-only settings status endpoint.

## Impact

Implements roadmap Step 15B under architecture sections 13 (REST), 14 (auth), and 17 (admin). Affects `apps/admin`, `packages/contracts`, and `packages/server`. No new dependencies or migration. Existing `bootstrap-user-token-abuse-controls` and `admin-remote-state-and-lists` requirements remain authoritative.
