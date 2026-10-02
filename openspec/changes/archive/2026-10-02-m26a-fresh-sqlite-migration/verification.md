# 26A verification — 2026-10-02

- `pnpm --filter @lacecms/platform-node test`: 5 files, 68 tests passed. Includes nested paths, persistence on repeat, memory preparation, blocked parents, concurrent parent creation and existing API startup/readiness contracts.
- `pnpm --filter @lacecms/cli exec vitest run src/migrate.test.mjs src/commands.test.mjs`: 2 files, 6 tests passed outside the sandbox, including local D1. The initial sandbox run timed out in the two local Cloudflare tests; the complete retry passed in 4.11 seconds. Node-only focused checks also passed in the sandbox.
- `node scripts/release.mjs packages --preview --output /private/tmp/lace-26a-packages-2`: succeeded. The isolated tarball consumer executed CLI and runtime migration binaries with fresh nested relative paths, repeated migration, stored application data and blocked parents. Existing import/declaration/source-exclusion and memory migration smoke checks passed. This package-only preview is not publication eligible and does not claim image/deployment acceptance. The initial sandbox attempt could not resolve npm; the retry used network access outside the sandbox.
- `node scripts/generated-project-acceptance.mjs snapshots --update` followed by `snapshots`: default and Cloudflare snapshots passed two byte-stable regenerations each. Only the operations document digest changed; template version and ownership remain unchanged.
- `pnpm exec vitest run tests/generated-project-acceptance.test.mjs`: 2 tests passed, including the acceptance subprocess and cleanup/redaction self-test.
- Root `pnpm typecheck`, `pnpm lint`, and `pnpm format:check`: passed.
- `pnpm exec openspec validate m26a-fresh-sqlite-migration --type change --strict`: passed before synchronization/archive. `pnpm exec openspec validate --specs --strict`: passed after synchronization; both delta requirement blocks are present in the accepted specs.
- No SQL migration, Cloudflare execution, runtime auto-migration, package version, template version or dependency change was introduced. Previously published artifacts remain immutable; the fix requires rebuilt packages and a future coherent release for ordinary consumers.

Full generated Compose and real deployment acceptance were not run for this bounded migration change; the required isolated package migration regression passed.
