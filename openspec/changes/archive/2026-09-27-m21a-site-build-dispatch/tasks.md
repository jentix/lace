## 1. Portable contracts and publication

- [x] 1.1 Add centralized 5-second site-build debounce, 60-second lease, and 5-second/15-minute/eight-attempt retry policy with deterministic clock/random tests in `packages/application`; verify boundary values and preserve media dispatch behavior.
- [x] 1.2 Define portable build request/retry, lease outcome, asynchronous completion, and discriminated trigger contracts in `packages/application`; verify in-memory doubles and type-level consumers cover accepted, synchronous success, and failure.
- [x] 1.3 Remove direct trigger invocation from publication, return queued target version or replay outcome, and update shared publication DTO plus Admin publish messaging; verify application, contract, and Admin publish tests.

## 2. Node persistence and dispatcher

- [x] 2.1 Unify publication/config-sync/manual enqueue through a transactional coalescing helper that records requester, reason, time, target, snapshot, and retry source; verify five-second debounce, concurrent insert, post-claim publication, and no duplicate idempotent event in Node repository tests.
- [x] 2.2 Implement atomic site-build claim and one-row-per-event creation/recovery using the existing schema; verify concurrent claim, fixed target, 60-second expiry, and stale lease rejection in repository contract tests.
- [x] 2.3 Implement lease-guarded accepted, synchronous-success, retryable-failure, terminal-failure, and asynchronous-completion transitions with sanitized errors; verify row/event atomicity, timestamps, provider ID, eight attempts, and idempotent completion.
- [x] 2.4 Add the Node site-build dispatcher with injected clock/random/trigger and a callable composition pass; verify accepted, synchronous success, trigger throw, malformed payload, jitter boundaries, and expiry recovery with focused dispatcher tests.

## 3. Administrator API

- [x] 3.1 Add actor-checked manual build and failed-build retry use cases backed by the Node repository; verify admin success, latest-version retry, coalesced receipt, missing/non-failed target, and editor/viewer denial.
- [x] 3.2 Add strict shared request/receipt DTOs, `202` Hono routes, and regenerated OpenAPI for `POST /api/v1/admin/builds` and `POST /api/v1/admin/builds/:buildId/retry`; verify empty-body success, unknown-key rejection, unauthorized requests, and no synchronous trigger.

## 4. Documentation and gates

- [x] 4.1 Document the queue receipt, publication response change, recovery pass, and 21A operational boundary in `docs/node-api.md` and relevant local-development docs; verify examples against the shared contracts and routes.
- [x] 4.2 Run focused package/API tests, root `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, OpenAPI check, and `pnpm exec openspec validate m21a-site-build-dispatch --type change --strict`; verify all pass before marking 21A complete.
