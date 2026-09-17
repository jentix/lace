## 1. Durable dispatch contracts and existing persistence state

- [x] 1.1 Extend the portable dispatcher and media-finalization contracts with conditional lease ownership, retry/terminal outcomes, and deterministic retry scheduling; verify focused application and test-double tests cover exclusive claims, stale completion rejection, lease recovery, bounded jittered retries, and terminal visibility.
- [x] 1.2 Verify and use the existing nullable SQLite/D1 `media.last_error` representation for terminal deletion diagnostics; verify retry atomically clears it without storing binary bytes, storage keys, credentials, or raw infrastructure errors.

## 2. SQLite recovery and reference integrity

- [x] 2.1 Implement Node SQLite conditional batch claim, 60-second lease recovery, guarded completion, retry scheduling, and terminal media failure persistence over `outbox_events`; verify focused repository tests cover concurrent claims, expired lease recovery, stale lease rejection, retry delay bounds, and maximum-attempt finalization.
- [x] 2.2 Implement guarded media-deletion finalization after object success or absence, preserving event/media state on storage failure or reference conflict; verify tests cover delete-success, already-absent objects, crash-safe re-dispatch, sanitized terminal failure, and retry enqueue behavior.
- [x] 2.3 Make Node projection insertion and in-memory parity require active media at persistence time; verify competing draft-save/delete and draft-save/retry interleavings leave either a valid reference or recoverable deletion state, never a reference to deleting media.

## 3. Node dispatch lifecycle and admin retry surface

- [x] 3.1 Implement the bounded Node media-deletion dispatcher with typed event validation, idempotent object-store deletion, policy injection, sanitized logging, and non-overlapping passes; verify focused dispatcher tests cover success, transient failure, terminal failure, and malformed/unrelated events.
- [x] 3.2 Wire dispatcher startup and graceful shutdown into Node API composition after MinIO preflight; verify integration tests prove queued work runs in the background, shutdown leaves unfinished work recoverable, and readiness/startup failures retain current behavior.
- [x] 3.3 Add `POST /api/v1/admin/media/:mediaId/retry-deletion`, regenerate the OpenAPI artifact, and verify authorization, accepted `delete_failed` retry, rejected active/deleting/referenced states, and absence of synchronous object deletion through HTTP tests.

## 4. Documentation and complete verification

- [x] 4.1 Document the Node deletion-dispatch configuration, retry policy, terminal-state operations, and restart recovery without secrets; verify the documentation matches the shipped defaults and retry endpoint.
- [x] 4.2 Run focused application, platform-node, server, and API tests, then `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm openapi:check`, and `pnpm exec openspec validate m09c-recoverable-deletion --type change --strict`; resolve all failures before marking this task complete.
