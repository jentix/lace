## 1. Durable state and transport

- [x] 1.1 Add the application security completion-read port and implement it on Node and D1 without writes or user-count inference; verify shared security cases for missing singleton, token-only state, interrupted claim, completion, and persisted state on a reopened runtime pass on both adapters.
- [x] 1.2 Add a strict shared setup-state schema/DTO and anonymous no-store `GET /api/v1/setup/state` in the portable Hono app; verify contract and API tests enforce the exact boolean-only shape, sanitized database failure, protected-data denial, no side effects, and no consumption of setup POST attempt quota, then regenerate and check OpenAPI.
- [x] 1.3 Extend Node and Worker composition tests with state reads before and after existing bootstrap and stale/concurrent-client completion; verify invalid/expired and foreign-email rejection, same-token/email interrupted resume, final token consumption, completed POST `404`, and restart persistence retain their accepted behavior on both runtimes.

## 2. Browser entry and setup

- [x] 2.1 Extend the shared admin client with validated no-store state read and existing-protocol setup submission, add the setup entity public API, and update test clients/fixtures; verify exact transport payloads, response validation, and sanitized request errors in focused client tests without retaining credentials in mutation variables.
- [x] 2.2 Add the public `/setup` route and anonymous entry/protected-route setup selection with safe return paths and retryable state failures; verify router tests cover incomplete/completed installations, authenticated precedence, direct completed setup, deep links and unknown paths, no protected-content flashes/requests, read retry, and unchanged direct-login behavior.
- [x] 2.3 Implement the setup feature/form and page using owned token-styled controls, bootstrap instructions, shared request validation, password visibility, pending announcement, and duplicate-submit prevention; verify component tests cover labelled fields, minimum password length, token/email validation, exact existing POST submission, focus, and exclusion of secrets from URL/storage/cache/error output.
- [x] 2.4 Implement success-to-sign-in and explicit recovery after `404` or an interrupted response, with read-only reconciliation retries and sanitized `429` guidance; verify tests cover invalid/expired token, incomplete same-token/email resume, completed stale client, lost successful response, failed state reconciliation, safe return paths, cleared secrets on closure, and no automatic POST replay or implied session.

## 3. Accessibility and consumer guidance

- [x] 3.1 Add setup browser coverage and update existing editorial/accessibility mocks for completed state; verify keyboard-only setup and sign-in, visible focus, password-toggle announcements, setup/error axe audits, reduced motion, and 375px layout pass alongside the affected existing browser suites.
- [x] 3.2 Update repository quickstart/auth operations and generated operations/package guidance to prefer token-based browser setup while retaining the placeholder-only API alternative; verify generator/onboarding assertions and a freshly generated project's instructions cover configured origin, one-hour expiry, 12-character minimum, same-token/email retry, closed completed setup, and no usable credentials. Reconcile a Step 27 README only if present; do not implement missing Step 27 features or 28B.

## 4. Completion checks

- [x] 4.1 Run the narrow affected contract, Node/D1 security, server/runtime, admin, generator, and browser suites, then root `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm openapi:check`, and `pnpm exec openspec validate m28a-browser-first-admin-setup --type change --strict`; record actual commands/results and mark tasks only after their specified verification passes.
