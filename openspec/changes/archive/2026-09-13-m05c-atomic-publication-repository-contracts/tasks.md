## 1. Portable command and parity boundaries

- [x] 1.1 Add a narrow portable media-deletion-mark command/result with caller actor and application-clock timestamp to `@lacecms/application` and update exported type/runtime tests; verify the command carries no database, transport, or object-storage callback.
- [x] 1.2 Update the `@lacecms/test-utils` in-memory content/media parity double to implement the new command and retain detached idempotent publication results; verify referenced media, independent media events, idempotency mismatch, and immutable prior publication tests pass.
- [x] 1.3 Extend the portable published-entry deletion command with the caller actor and application-clock timestamp, update the use case and parity double, and verify neither persistence implementation needs a runtime-local clock or inferred identity.

## 2. Atomic Node public-projection mutations

- [x] 2.1 Extend the Node content repository with deterministic test-only mutation checkpoints and explicit generated-ID dependencies; verify production construction has no fault behavior and every named checkpoint can throw under test.
- [x] 2.2 Implement guarded Node publication using ordered conditional `INSERT ... SELECT` snapshot/block/reference copying, route replacement, published pointer/version update, idempotency persistence/replay, outbox coalescing, and old-snapshot cascade; verify focused tests cover stale revision, route collision, immutable draft/public divergence, matching/mismatched replay, and claimed-versus-unlocked event behavior.
- [x] 2.3 Implement atomic Node deletion of draft-only and published entries using the supplied actor/time; verify published deletion removes the route and cascaded aggregate, advances public version exactly once, coalesces build work, and leaves the model intact.
- [x] 2.4 Implement the portable media-deletion mark in the Node adapter using the supplied actor/time; verify referenced/missing/non-active media is unchanged, eligible media becomes `deleting`, and each successful mark creates a separate deletion event without invoking object storage.

## 3. Reusable repository contracts

- [x] 3.1 Build a factory-driven `@lacecms/test-utils` repository contract suite with deterministic fixtures and normalized relational-state inspection; verify it asserts cardinality, revision guards, route rollback, immutable publication, idempotency, reference projection, cascades, build-event coalescing, and cursor order.
- [x] 3.2 Add contract fault-injection coverage for every draft-save, publication, entry-deletion, and media-deletion checkpoint; verify each forced failure preserves the complete prior state with no partial public projection or outbox/idempotency write.
- [x] 3.3 Run the same contract suite against freshly migrated temporary-file and in-memory Node SQLite databases; add `EXPLAIN QUERY PLAN` fixtures proving the declared route, block-order, media-reference, entry-list, and outbox indexes are selected.

## 4. Documentation and full verification

- [x] 4.1 Update Node persistence documentation to describe Session 5C public-projection atomicity, durable outbox handoff, asynchronous media deletion, and the required explicit migration command; verify documentation names the supported database modes and does not imply a synchronous build or object deletion.
- [x] 4.2 Run focused application, test-utils, and platform-node tests; then run root `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm exec openspec validate m05c-atomic-publication-repository-contracts --type change --strict`; resolve every failure before marking this task complete.
