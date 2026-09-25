## Why

Step 15B's browser admin cannot sign in when reached at `http://localhost:3000/admin/login`: the generated local environment configures `http://127.0.0.1:3000` as the canonical origin, so the authentication provider rejects the `localhost` browser origin with 403. Both hostnames reach the same local stack, and users commonly open either one.

## What Changes

- Accept `localhost` and `127.0.0.1` as equivalent trusted browser origins on the same port in local development when the configured public origin is one of them.
- Keep production and non-loopback deployments limited to their explicitly configured trusted origin.
- Cover valid local sign-in and rejected foreign-origin requests with integration tests; clarify the local admin URLs in the developer guide.

Scope: regression fix for Step 15 Session 15B login. Non-goals: general CORS support, arbitrary host aliases, disabled CSRF checks, or changes to account credentials and persistence.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `authentication-and-actor-boundary`: Extend trusted-origin behavior narrowly for local loopback development.

## Impact

Architecture sections 14 and 15 retain the same-origin and explicit trusted-origin invariants. The change affects `packages/auth`, its Node integration tests, and local documentation. There is no data migration or dependency change.
