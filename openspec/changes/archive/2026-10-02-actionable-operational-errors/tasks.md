## 1. Failure contract

- [x] 1.1 Implement shared failure diagnostics and integrate operational/upgrade presentation; verify additive JSON fields, fixed operation vocabulary, unchanged success responses and code/exit preservation with focused tests.

## 2. Known causes

- [x] 2.1 Classify filesystem, schema, configuration and completed-bootstrap failures at command boundaries and D1 transport; verify actual Node/local D1 failures and controlled remote/provider/subprocess failures without secret disclosure or mutation.

## 3. Acceptance and documentation

- [x] 3.1 Cover pending/blocked sync, completed setup, invalid target/config and upgrade conflict/recovery in human and JSON modes; verify state preservation and run the full CLI regression suite.
- [x] 3.2 Document diagnostic fields/recovery and record 26B completion; verify root typecheck, Oxlint, Oxfmt check and strict OpenSpec validation before synchronizing, archiving and committing the substep.

## Verification evidence

- Full CLI regression: 18 files / 133 tests passed (local D1 and process interruption tests require loopback access outside the restricted sandbox).
- Final focused diagnostics/operational regression after wrapped-error and partial-ledger coverage: 2 files / 10 tests passed.
- Root `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `git diff --check` and strict change validation passed. Oxlint's four existing db test warnings remain outside this change; CLI has no warnings/errors.
- No database, dependency, template or persisted-format migration is required.
