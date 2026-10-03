## Context

See `proposal.md` for motivation and scope. `SecurityService` in `packages/application/src/index.ts` has bootstrap and credential lifecycle operations but no installation-state read. Node's `NodeSecurityService` and Worker's `D1SecurityService` already read `installation_state.setup_completed_at` to enforce closure. The D1 helper is private; absence of a singleton before token issuance currently means incomplete setup. The database already has all required state.

`packages/server/src/app.ts` owns the portable setup route and validated responses. Its setup handler maps non-authorization bootstrap failures to `404`, so invalid/expired credentials, completion, and some interruptions cannot be distinguished from the POST result alone. Both runtime security suites reuse `packages/test-utils/src/security-contract.ts`. Worker HTTP smoke coverage is in `apps/api/src/worker-smoke.test.mjs`.

The admin router is in `app/router/router.ts`, with `/admin` as its base path. Protected-route guards resolve the session before redirecting anonymous visitors to sign-in. The shared browser client validates responses and sanitizes errors; sign-in uses feature-level mutation state. Admin source must preserve `app → pages → widgets → features → entities → shared` direction, public indexes, one component per folder, and token-only styles. Generated onboarding currently lives in `packages/create-lace/templates/docs/lace-operations.md` and `packages/create-lace/README.md`; the inventory classifies the operations guide as managed. This checkout has no archived Step 27 change and no generated README template. Update these delivered surfaces and the repository quickstart; if a generated README has landed by apply time, reconcile its setup text too without implementing the other Step 27 features.

## Goals / Non-Goals

**Goals:** Add the smallest anonymous state projection, preserve durable bootstrap authorization, give the browser a deterministic recovery path, and verify the same state/closure behavior on SQLite and D1. Keep setup secret lifetime restricted to form/request memory and update the delivered consumer instructions.

**Non-Goals:** Change bootstrap token issuance or persistence, introduce a database migration, broaden public signup, infer completion from existing users, automatically sign in, or introduce tour state. No change to the architecture invariants is needed.

## Decisions

### 1. Read completion through the existing security port

Add `isSetupComplete(): Promise<boolean>` to the application security port and both runtime adapters. Read only the persisted singleton completion marker. D1 can expose/reuse its existing completion query; Node performs the matching read. Missing singleton means false only when the query succeeds; database errors propagate. Neither adapter inserts a row, counts users, lists tokens, or touches the clock on this read. Reject inferring setup from a user count: an interrupted claim may already have created a user without completing installation setup.

`packages/contracts` owns a strict setup-state schema and exported DTO. The portable server registers `GET /api/v1/setup/state`, validates its minimal response, sets `Cache-Control: no-store`, and preserves normal sanitized server error handling when the capability/database is unavailable. The state read does not go through the sensitive setup-attempt bucket. General request controls and request-ID/status logging remain active. Regenerate OpenAPI from the same schema. The public SDK needs no setup API.

### 2. Select setup only after the session guard

Extend the shared admin client with a no-store setup-state read and a guarded setup submission using the existing request/response schemas. Add an `entities/setup` unit for the state query; new `features/setup-admin` and `pages/setup` slices use shared controls and public indexes.

Register `/setup` outside the protected shell. Anonymous `/admin/` and protected deep-link visitors retain a sanitized return path but use the state read to choose `/setup` or `/login`. The guard shows neutral loading while it resolves, and a sanitized retryable error if state cannot be read. A direct `/setup` read always checks completion afresh and redirects completed installations to sign-in; authenticated visitors go to `/content`. Ordinary direct `/login` retains its existing sign-in behavior and authenticated redirect, so accepted sign-in semantics are not widened into a new registration surface.

Do not persist or indefinitely memoize setup state: use `cache: "no-store"`, no durable browser storage, and a fresh read on entry/recovery. Avoid navigation loops on failed reads. Reuse existing loading/error primitives; choose a route-boundary error component or equivalent retryable gate that can rerun the failed read without exposing protected content.

### 3. Keep the form and mutation independent of authorization

Render a centered setup card consistent with the login card, with email focus, shared TextField/PasswordField controls, a masked bootstrap-token field, validation messages linked to controls, and bootstrap instructions. Explain the generated local command `pnpm auth:bootstrap` and the operator CLI `lace auth bootstrap` with the appropriate environment/target; the browser never mints or accepts a token through a URL. Link instructions to delivered onboarding guidance without placing deployment details into the editorial flow.

Use the shared setup request schema for email, password length 12–1024, and token length 40–128. Keep password/token in local form state, avoid putting secrets in TanStack Query mutation variables, reset mutation state on closure, and do not pass submitted values into diagnostics. A closure-based mutation without credential arguments can follow the existing sign-in pattern; error rendering must use sanitized messages and field paths rather than transport bodies. Disable submission while pending and announce its state. Existing server limits, origin policy, body limits, token hashing, email claim/resume, and token consumption remain authoritative.

### 4. Confirm closure after ambiguous outcomes

After `201`, clear secrets, invalidate setup state, and navigate to ordinary sign-in with a non-sensitive completion notice and the safe return path. The new notice is presentation state, not proof of an authenticated session; sign-in still uses the provider boundary and session source.

For `404` or a network failure with an uncertain POST outcome, issue a fresh GET:

| Fresh state | Browser behavior |
| --- | --- |
| Complete | Clear secrets, close setup, offer sign-in; say setup is complete without attributing the administrator to this submission. |
| Incomplete after 404 | Show neutral token-check/reissue guidance, retain email and transient form input for correction, allow only explicit resubmission. |
| Incomplete after interrupted request | Explain explicit same-token/email retry; do not change the claimed email automatically or replay the POST. |
| Read fails | Show retryable reconciliation error; retry repeats only GET before setup submission becomes available again. |

Validation/authorization failures show sanitized inline errors; `429` shows safe rate-limit guidance and remains an explicit retry. Neither recovery nor state reads establish a session. Reject treating every `404` as success, introducing detailed public token failure reasons, automatic retry of credential-bearing mutations, or automatic login.

### 5. Verify through existing runtime and browser harnesses

Extend shared security contract cases for fresh/missing singleton, reads without writes, completion and reopen/restart persistence, and interrupted claim visibility; run them on Node SQLite and D1. HTTP tests verify exact response shape, no-store, anonymous access with continued protected-route denial, database failures, token rejection, POST closure, and state GET not consuming setup-attempt quota. Extend real Node and Worker composition tests to call the new route before/after bootstrap. Maintain existing claim/resume, foreign-email, expiry, and token-consumption assertions; add stale/concurrent-client completion coverage. If those tests expose a protocol defect needing a new design, pause apply and revise artifacts rather than weakening the existing accepted guarantees.

Admin tests cover entry/deep-link routing, session precedence, setup-state failures, no protected requests before authentication, exact POST payload, validation, pending duplicate prevention, success, ambiguous `404`, interruption, failed reconciliation, rate limiting, safe return locations, and secret exclusion from query variables/URLs/storage/errors. Adapt existing mock clients and browser API fixtures to return completed state for ordinary editorial tests. Add a setup browser suite with deterministic API fixtures for failures and explicit retries; audit setup and error states with axe, complete setup and sign-in by keyboard, assert visible focus, password-toggle state, reduced motion, and 375px layout. Runtime contracts and real HTTP tests prove backend parity; browser fixtures prove UI behavior, without claiming a real Cloudflare deployment.

Update `README.md`, `docs/auth-operations.md`, `packages/create-lace/README.md`, `packages/create-lace/templates/docs/lace-operations.md`, and related consumer assertions; reconcile any Step 27 README present at apply time. Browser setup becomes the primary path; retain the placeholder-only curl alternative, token lifetime/claim retry/completed closure notes, minimum password length, and configured origin. Do not mark 28B or the entire Step 28 complete.

## Risks / Trade-offs

- Public completion boolean reveals whether setup is finished → expose only this necessary boolean with no identity, timestamps, token presence, or config.
- Stale state across tabs → no-store reads on entry and recovery; POST remains the authoritative closure check.
- Existing setup `404` masks several failures → reconcile with GET and use neutral errors rather than inferring invalid token or success from status alone.
- A network failure can leave a claimed token/user → preserve explicit same-token/email resume, avoid credential-bearing automatic retries, and never infer completion from the presence of a user.
- Adding setup reads can break existing admin fixtures → provide explicit completed-state fixtures and rerun the relevant editor/accessibility suites.
- Transient form memory is unavoidable → do not persist it, reset on completion/unmount, and avoid mutation variables or diagnostic reflection.

## Migration Plan

No schema migration or new dependency. Ship contracts, security adapters, server route, and admin assets together in Node and Worker bundles. Run focused contract/API/admin/browser/generator tests, then root typecheck, Oxlint/boundary lint, Oxfmt check, OpenAPI check, and strict change validation. A rollback restores the earlier admin/API artifacts; stored tokens and completion remain compatible, and the documented API alternative continues to work. Archive and synchronize only after verified implementation under the repository workflow.
