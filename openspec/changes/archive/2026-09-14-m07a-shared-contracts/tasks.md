## 1. Contract foundation

- [x] 1.1 Add the portable public package dependencies and shared Valibot primitives for JSON values, identifiers, ISO-8601 UTC timestamps, opaque cursors, revision numbers, ETags, and idempotency keys; verify `pnpm --filter @lacecms/contracts typecheck` passes.
- [x] 1.2 Implement explicit conversions between portable domain/application values and JSON transport values without exposing database rows; verify focused mapper tests cover snapshots, blocks, media, builds, and timestamps.

## 2. Content API schemas

- [x] 2.1 Define strict request and response schemas plus inferred DTO types for content models, entry lists/details, complete draft saves, publication, deletion, public reads, build export, media metadata, site builds, and cursor pagination; verify valid round trips in the contracts test suite.
- [x] 2.2 Implement request-precondition normalization with canonical body `expectedRevision`, optional equivalent `If-Match`, and disagreement rejection; verify header-only, body-only, matching, malformed, and conflicting cases.

## 3. Safe error contracts

- [x] 3.1 Implement a stable status/code classifier for every existing domain/application error and strict sanitized error-envelope schemas, including JSON-Pointer validation issue paths; verify the mapping table and absence of stack, SQL, and validator-internal values in output.
- [x] 3.2 Add `expectedRevision` plus an internal publication-identity guard to the portable deletion command and use case; verify stale revisions and concurrent publication state fail before any delete mutation.
- [x] 3.3 Enforce the guarded deletion atomically in the in-memory double and Node SQLite repository; verify stale deletion preserves the entry, route, public version, and build state.

## 4. Verification

- [x] 4.1 Add invalid-payload tests covering unknown keys, wrong types, invalid timestamp/cursor/ETag/idempotency values, and malformed content mutations; verify `pnpm --filter @lacecms/contracts test` passes.
- [x] 4.2 Add application and Node repository regression tests for matching, stale, and publication-race deletion guards; verify their focused suites pass.
- [x] 4.3 Run the required focused tests, root `typecheck`, `lint`, `format:check`, and `pnpm exec openspec validate m07a-shared-contracts --type change --strict`; record no deferred behavior and mark completed tasks only after each check passes.
