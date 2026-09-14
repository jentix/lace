## 1. Rename-hint identity handling

- [x] 1.1 Exclude `renamedFrom` from model and whole-configuration structural/projection hash inputs while retaining it in normalized runtime models; verify config tests prove adding or removing the hint preserves all hashes and public projections omit it.

## 2. Portable planner contracts

- [x] 2.1 Replace the provisional model-sync inspection/apply types in `@lacecms/application` with readonly stored-state, operation, diagnostic, plan, report, and check-result contracts; verify `pnpm --filter @lacecms/application typecheck` accepts no database-row, REST, or transaction-callback type.
- [x] 2.2 Implement the pure planner with exhaustive operation/diagnostic discriminants and detached immutable results; verify focused application tests cover create, no-op, label-only update, version update, kind change, version regression, and structural-hash-without-version-bump outcomes.

## 3. Content-safety and rename decisions

- [x] 3.1 Add planner validation for deterministic sorting, duplicate stored identity evidence, explicit `renamedFrom` matching, missing/ambiguous rename evidence, and residual removal handling; verify tests prove valid same-kind rename is one operation, an unhinted key replacement remains create plus removal, and an empty residual model is a safe removal.
- [x] 3.2 Enforce entry and draft/published-snapshot safety gates for removals and structural changes; verify tests name the affected model/snapshot states and prove invalid plans contain no executable unsafe transition.

## 4. Deterministic reports and fixture parity

- [x] 4.1 Render the canonical plan as stable human text and JSON-safe data, and derive non-mutating check status from validity plus pending operations; verify equivalent shuffled inputs produce byte-identical JSON and check returns zero only for a valid no-op.
- [x] 4.2 Update `@lacecms/test-utils` in-memory content-store helpers and focused tests to provide planner-compatible persisted model/snapshot summaries rather than blind synchronization apply behavior; verify returned fixture data remains detached from caller mutation.

## 5. Documentation and verification

- [x] 5.1 Add concise operational documentation for the planner report categories, check semantics, and explicit Session 6B apply boundary; verify it does not promise a wired CLI or automatic content migration.
- [x] 5.2 Run focused config, application, and test-utils tests, then `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm exec openspec validate m06a-configuration-sync-planner --type change --strict`; resolve every failure before marking this task complete.
