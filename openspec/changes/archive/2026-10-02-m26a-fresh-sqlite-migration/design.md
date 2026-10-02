## Context

See `proposal.md` for the onboarding failure and scope. `migrateNodeDatabase` in `packages/platform-node/src/index.ts` currently calls `openNodeDatabase` directly. Both the runtime executable (`src/migrate.ts`) and CLI `runMigration` delegate to it. The common opener enables foreign keys and WAL; migrations use packaged `@lacecms/db` SQL and always close the connection in `finally`.

Runtime readiness tests already prove that startup does not install migrations. The generated acceptance runner creates `.lace/data` in environment setup before the operator journey, concealing the fresh-directory defect. `scripts/release-artifacts.mjs` has an isolated tarball consumer smoke harness, including a memory migration, that can also execute both packaged entrypoints. Generated operations already list `pnpm db:migrate`; feedback §2 records the manual workaround.

## Goals / Non-Goals

**Goals:** make all explicit Node migration callers share filesystem preparation; verify observable persistence and failures using real SQLite and isolated packaged entrypoints; retain existing output and readiness semantics.

**Non-Goals:** general connection auto-preparation, new error DTOs or diagnostic taxonomy, schema/version changes, automatic sync/bootstrap, and changes to Cloudflare migration execution.

## Decisions

1. **Prepare parents inside the shared explicit migration function.** For any path other than the exact `:memory:` sentinel, call synchronous recursive directory creation on `dirname(databasePath)` before opening SQLite. This matches the synchronous migration API and Node path semantics without changing signatures or introducing dependencies. Relative paths retain process-working-directory resolution. Avoid implementing this only in the CLI, which would leave runtime entrypoints broken, or in `openNodeDatabase`, which would broaden startup side effects.

2. **Preserve filesystem and migration failure semantics.** Recursive creation accepts existing directories and races in which another process creates them. It does not delete files, change existing permissions or repair conflicting path components. Let directory errors propagate to runtime callers; the CLI's existing safe fallback owns sanitization, `OPERATION_FAILED` and exit code 6. More detailed reasons belong to 26B. Keep migration SQL, transaction behavior, ledger reporting, pragmas and connection cleanup unchanged. Filesystem preparation is not transactional: successfully created empty ancestors can remain after failure; never roll them back by deleting potentially shared directories. Retrying after operator correction is safe.

3. **Cover both entrypoints without engine imports.** Extend focused platform-node and CLI tests, and the isolated tarball consumer smoke in `scripts/release-artifacts.mjs`. Run the packed CLI binary and packed platform-node `dist/migrate.js` as child processes in the consumer working directory, selecting different fresh relative nested paths via `LACE_DATABASE_PATH`. Check installed ledgers, seed real application data, repeat migration and reopen to prove preservation. Use a regular file as a blocked ancestor for deterministic directory-creation failure; verify nonzero exits, CLI human/JSON sanitization and absence of a database. Check memory migration with a filesystem-preparation spy in focused tests, and retain the packed memory smoke. Test concurrent parent preparation without promising serialization of simultaneous SQLite schema migrations. Retain existing readiness/startup coverage.

4. **Unmask consumer acceptance and update current instructions.** Remove only the pre-migration `.lace/data` creation from generated acceptance environment setup. Add a check that the directory is initially absent before the first migration and present afterwards. Document that explicit migration creates parents automatically in the generated operations guide and update affected generator snapshots/digests using the existing snapshot workflow. Mark feedback §2 fixed only after verification, preserving the historical workaround as context and identifying the source revision fix as requiring newly built artifacts. Do not claim published `0.1.0-alpha.1` already contains the fix or refresh versions in this session.

## Risks / Trade-offs

- Invalid or inaccessible operator-selected paths → propagate the failure before opening SQLite; deterministic blocked-parent tests cover this boundary without relying on privileged-user permission behavior.
- Directory creation may leave empty ancestors → document this and preserve them; directory removal would risk unrelated concurrent state.
- Workspace-linked tests could hide packaging defects → execute both binaries from an isolated packed consumer and retain source-path exclusion checks.
- Full generated Compose acceptance requires Docker/images → use the package smoke as the required 26A isolated migration check; run generated snapshots and focused acceptance harness checks, and do not count these as full deployment acceptance.

## Migration Plan

No new SQL migration or schema version is needed. Rebuild Node/CLI packages for source and local packed verification. Consumers receive the behavior when a later coherent release delivers those rebuilt artifacts; published alpha packages remain immutable. Reverting the helper restores the prior manual-directory requirement without reverting or deleting any persisted data. After implementation and strict validation, synchronize the two delta specs and archive this change, then commit the completed unit on the step-26 branch as requested.
