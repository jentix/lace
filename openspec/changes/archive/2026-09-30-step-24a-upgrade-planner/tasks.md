## 1. Validated inspection

- [x] 1.1 Implement manifest validation and safe managed-file inspection; verify malformed/newer manifests, unsafe paths, symlinks and target hash mismatch with focused tests.

## 2. Ownership planner

- [x] 2.1 Implement sorted three-way decisions and unified diffs; verify replace/add/remove/current/local edits/ownership conflicts, dependency and image updates, binary and newline cases with focused tests.

## 3. CLI and acceptance

- [x] 3.1 Add upgrade dispatch, deterministic human/JSON output and explicit apply refusal; verify process-level exit codes, credential-free Node/Cloudflare reviews, repeated output and byte-identical project/template snapshots.
- [x] 3.2 Document target preparation, command usage, exit codes and the 24B boundary; verify examples against the CLI and run CLI/generator regression tests, root typecheck, lint, format check and strict OpenSpec validation.

## Verification evidence

- CLI suite: 65 tests passed across 7 files, including 53 new upgrade tests. Local D1 regression tests passed with access to the local Worker runtime; sandbox-only execution timed out.
- Generator regression suite: 8 tests passed.
- Root `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, strict change validation and `git diff --check` passed. CLI lint has no warnings; four existing database-test warnings remain outside this change.
- Generated Node and Cloudflare projects produced deterministic JSON/human plans with byte-identical project and target snapshots.
- Unified text diffs reconstructed the target bytes through `git apply`, including UTF-8, CRLF, empty content and missing final newlines.
