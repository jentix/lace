## 1. Shared explicit migration boundary

- [x] 1.1 Add recursive parent creation before opening file-backed SQLite in `packages/platform-node/src/index.ts`, skipping `:memory:` and preserving the common opener and SQL; verify focused platform-node tests for fresh nested relative/absolute paths, installed versions, repeat migration and existing application/adjacent-file preservation.
- [x] 1.2 Cover memory, blocked-parent failure and concurrent directory preparation in focused platform-node migration tests; verify no filesystem preparation for memory, no selected database on failure, unchanged blocking file and compatibility with already-created parents. Run the existing readiness/startup tests to confirm migration remains explicit.
- [x] 1.3 Extend focused CLI migration/command coverage for nested paths and directory failure; verify installed-version output and the existing operation failure exit/symbolic code, one-object JSON response and sanitized human output without secret/path details.

## 2. Packaged consumer regression

- [x] 2.1 Extend `scripts/release-artifacts.mjs` isolated tarball-consumer smoke with both the CLI binary and platform-node runtime migration executable; run package preparation in a disposable preview output and verify fresh nested paths, repeated migration, seeded application data preservation and blocked-parent failures for both entrypoints, with no source-workspace imports.
- [x] 2.2 Remove pre-migration `.lace/data` creation from `scripts/generated-project-acceptance.mjs` and assert absence before/presence after the first migration; verify the harness self-test still redacts failures and cleans temporary state, and the isolated packed regression from 2.1 passes without manual directory setup.

## 3. Current onboarding documentation

- [x] 3.1 Explain automatic parent creation by explicit migration in `packages/create-lace/templates/docs/lace-operations.md`, regenerate affected default/Cloudflare snapshots and managed digests, and verify generated snapshot acceptance passes without version or ownership changes.
- [x] 3.2 Update `docs/onboarding-feedback.md` §2 with verified fix evidence and the rebuilt-artifact requirement while retaining the historical workaround as context; verify the normal supported flow is `pnpm db:migrate` and does not claim the immutable published alpha already includes the fix.

## 4. Integration and quality gate

- [x] 4.1 Run the relevant platform-node/CLI tests, packed-consumer smoke and generated snapshot/harness checks, then root `pnpm typecheck`, `pnpm lint`, `pnpm format:check` and `pnpm exec openspec validate m26a-fresh-sqlite-migration --type change --strict`; record actual verification results and confirm no SQL, Cloudflare execution or automatic API migration changes.
