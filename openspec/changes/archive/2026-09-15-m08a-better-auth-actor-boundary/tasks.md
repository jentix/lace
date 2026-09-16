## 1. Authentication persistence and adapter

- [x] 1.1 Add the pinned Better Auth dependency to `@lacecms/auth`, expose the existing Drizzle provider tables through `@lacecms/db`, and verify the lockfile and workspace install resolve the configured version.
- [x] 1.2 Verify the baseline `user`, `session`, `account`, and `verification` schema against Better Auth; add the minimal ordered forward migration and migration test only if compatibility requires it, and verify a freshly migrated SQLite database enforces the `viewer` default and role constraint.
- [x] 1.3 Implement the `@lacecms/auth` factory for disabled-public-sign-up email/password auth, explicit trusted-origin/CSRF/cookie settings, and fail-closed session-to-`Actor` conversion; verify focused tests cover sign-up rejection, viewer mapping, missing/expired session, invalid role, origin rejection, and production `Secure` cookies.

## 2. HTTP and Node composition boundary

- [x] 2.1 Extend the portable Hono app input with the narrow authentication route handler, mount `/api/auth/*` before API/admin fallbacks, and verify server tests cover route precedence, anonymous public/health paths, protected-path actor resolution, and use-case-driven permission denial without handler role checks.
- [x] 2.2 Extend Node runtime settings and composition to validate authentication secret/origin inputs, construct the auth factory from the existing SQLite connection, and replace the production anonymous resolver; verify Node/API integration tests cover startup rejection without secret disclosure and a valid session reaching a protected route.
- [x] 2.3 Preserve the test-only actor fixture while preventing it from production composition, and verify its existing runtime guard and production-header rejection tests still pass.

## 3. Contract hygiene and change verification

- [x] 3.1 Regenerate and check in the OpenAPI artifact only if the versioned API contract changes; verify `pnpm openapi:check` passes.
- [x] 3.2 Run focused auth, DB, server, platform-node, and API tests, then run root `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, and `pnpm exec openspec validate m08a-better-auth-actor-boundary --type change --strict` successfully.
