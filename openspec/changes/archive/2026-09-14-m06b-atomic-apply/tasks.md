## 1. Portable synchronization boundary

- [x] 1.1 Extend `@lacecms/application` with detached configuration-sync state-read, guarded apply input/result, and dry-run coordination contracts that carry normalized models, approved plan, expected stored summary, audit time/actor, and page-create identities; verify application typecheck and focused tests cover valid, invalid, stale, and no-op inputs without database-row or transaction-callback types.
- [x] 1.2 Materialize page draft data from normalized field defaults through the existing portable validation rules, using the model label or stable-key fallback for the title and `system:content-sync` audit actor; verify focused tests cover defaults and required fields absent from a draft.

## 2. In-memory parity

- [x] 2.1 Implement the configuration-sync read/apply ports in `InMemoryContentStore`, including detached summaries, canonical-plan/fresh-state guarding, all executable operations, singleton page drafts, one public-version advance, and no-op idempotency; verify test-utils tests cover dry run, repeat apply, rename, removal, and stale-plan rejection.

## 3. Node SQLite atomic apply

- [x] 3.1 Add the Node repository's bounded stored-model summary query and guarded apply transaction; re-plan against fresh transactional state and reject invalid, mismatched, or stale approved plans before any write; verify Node tests cover read ordering, dry-run non-mutation, and two-connection contention with one winner.
- [x] 3.2 Apply create, label-update, version-update, explicit rename, and safe removal with identity-row guards, using the existing foreign-key cascade for rename; verify Node tests retain populated renamed entries, reject inferred/stale operations, and preserve data on no-op repeat apply.
- [x] 3.3 Create one draft-only singleton for each newly created page in the apply transaction with configured defaults, no blocks, `NULL` slug, label/key title, supplied IDs, and `system:content-sync`; verify collections receive no generated entry and an injected singleton-write failure rolls back the model identity.
- [x] 3.4 Advance published state once and create/coalesce one pending `site.build.requested` event only when committed operations change the public configuration projection; verify Node tests cover one apply with multiple operations, pre-existing pending work, and no public-state/outbox writes for valid no-ops.
- [x] 3.5 Extend Node mutation checkpoints and failure tests around synchronization operations; verify every injected failure rolls back content models, generated page entries/snapshots, published state, and outbox rows.

## 4. Documentation and verification

- [x] 4.1 Update `docs/configuration-synchronization.md` with the dry-run/apply boundary, stale-plan rejection, page singleton defaults, idempotency, and build-version behavior while stating that CLI and Cloudflare wiring remain deferred; verify documentation matches the delta specs.
- [x] 4.2 Run focused application, test-utils, and platform-node tests, then `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm exec openspec validate m06b-atomic-apply --type change --strict`; resolve every failure before marking this task complete.
