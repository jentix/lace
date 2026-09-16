## 1. Portable security contracts and database support

- [x] 1.1 Define application-domain ports, commands, result types, stable errors, and deterministic doubles for setup claims, user lifecycle, build-token lifecycle, and fixed-window rate-limit decisions; verify focused application/test-utils tests cover portable outcomes without HTTP or database rows.
- [x] 1.2 Add the minimal additive SQLite/D1-compatible migration and Drizzle schema exports for disabled users plus indexed installation, setup-token, build-token, active-admin, and rate-limit state; verify fresh migration, foreign-key, uniqueness, and query-plan tests pass.
- [x] 1.3 Implement Node SQLite security repositories with short guarded transactions for first-admin completion and last-active-admin protection, plus HMAC bucket-key and constant-time token adapters; verify expiry/retry/takeover, concurrency, revocation, `last_used_at`, and raw-subject secrecy tests pass.

## 2. Authentication and transport contracts

- [x] 2.1 Extend the Better Auth boundary with the narrow provider operations and disabled-account fail-closed actor resolution required by setup and user administration; verify cookie flags, trusted-origin rejection, password handling, disabled-session denial, and role mapping tests pass.
- [x] 2.2 Add Valibot request/response contracts and DTO mappers for setup-admin, user list/create/update, and build-token list/create/revoke flows; verify negative validation tests and one-time-secret serialization tests pass.
- [x] 2.3 Extend shared error/response helpers so rate-limit exhaustion emits the documented `429` envelope and positive `Retry-After`; verify contract and HTTP-header tests pass.

## 3. Portable HTTP boundary and Node composition

- [x] 3.1 Extend the Hono app input and routes for setup admin, admin-only user and build-token management, and credential-authenticated build export; classify sensitive routes before work, preserve actor/use-case permission checks, and verify setup `404`, permission matrix, build-token scope, revoked-token, and rate-limit integration tests pass.
- [x] 3.2 Compose the Node security capabilities from validated runtime configuration, including secret-safe HMAC configuration and no-plaintext structured logging; verify Node startup diagnostics and end-to-end HTTP bootstrap/retry/user/token/limiter tests pass.
- [x] 3.3 Regenerate the checked-in OpenAPI document for any versioned contract changes and verify `pnpm openapi:check` passes.

## 4. Change verification and documentation

- [x] 4.1 Document bootstrap-token issuance/one-time reveal, setup recovery, user-management, build-token revocation, and rate-limit operator behavior without showing real secrets; verify documentation accurately names only supported Session 8B flows.
- [x] 4.2 Run focused auth, application, contracts, DB, server, platform-node, and API tests, then `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, and `pnpm exec openspec validate m08b-bootstrap-users-tokens-abuse-controls --type change --strict`; verify every command succeeds before marking the change complete.
