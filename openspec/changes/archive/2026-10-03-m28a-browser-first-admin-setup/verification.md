# Session 28A verification

Verified on 2026-10-03 in `codex/step-28-first-admin-setup` using the repository-pinned pnpm/OpenSpec toolchain. No new dependencies or schema migrations were introduced.

## Checks

- `pnpm exec vitest run packages/platform-node/src/security-contract.test.mjs packages/platform-cloudflare/src/security-contract.test.mjs packages/server/src/app.test.mjs packages/contracts/src/index.test.mjs --maxWorkers=2 --exclude '.release-artifacts/**'`: 4 files, 51 tests passed. Relevant packages were rebuilt with Turborepo first.
- `pnpm exec vitest run apps/api/src/node-server.test.mjs apps/api/src/worker-smoke.test.mjs --maxWorkers=2 --exclude '.release-artifacts/**'`: 2 files, 9 tests passed. Real Node listener and locally executed Worker bundle cover setup state, non-consumption of setup-attempt allowance, completion and concurrent stale requests. Existing Worker smoke verifies persisted completion after runtime disposal through a fresh operator process.
- `pnpm --filter @lacecms/app-admin exec vitest run --maxWorkers=2`: 111 files, 336 tests passed, including new client, setup routing, form and recovery coverage.
- `pnpm --filter @lacecms/app-admin exec playwright test setup.e2e.ts accessibility.e2e.ts editor.e2e.ts --workers=2`: 29 passed initially; one existing editor test still expected the old Builds placeholder. Its fixture and assertion were updated to the delivered empty build-history behavior. `pnpm --filter @lacecms/app-admin exec playwright test editor.e2e.ts --grep 'admin routes distinguish' --workers=1`: the remaining test passed. Total verified browser coverage: 30 tests, including setup keyboard/axe/375px/reduced-motion checks.
- `pnpm exec vitest run packages/create-lace/src/index.test.mjs packages/create-lace/src/onboarding.test.mjs --exclude '.release-artifacts/**' --maxWorkers=2`: 2 files, 12 tests passed after rebuilding `create-lace`. Fresh generated operations guidance retains the API alternative and identifies compatibility with pre-browser alpha artifacts.
- `pnpm typecheck`: passed, including root configuration and Worker entry types.
- `pnpm lint`: passed, including Oxlint, package/admin boundaries, and admin token rules.
- `pnpm format:check`: passed.
- `pnpm openapi:check`: passed with the regenerated OpenAPI artifact staged for the requested commit. The repository check compares regeneration with the saved artifact and requires no unstaged artifact diff.
- `pnpm exec openspec validate m28a-browser-first-admin-setup --type change --strict`: passed.
- `pnpm --filter @lacecms/app-admin build`: passed. Vite retains a non-fatal large-chunk advisory.
- `git diff --check`: passed.

## Coverage and limits

Setup uses only the existing operator-issued token protocol; anonymous state exposes one completion boolean and grants no authorization. Tests cover missing singleton, token-only state, interrupted claim, completion persistence, protected-resource denial, sanitized failures, explicit same-token/email retry, expired/invalid/foreign-email credentials, stale/concurrent requests after completion, and secret exclusion from URLs/storage/errors. UI recovery does not automatically replay POST or establish a session.

Node SQLite and local D1/Worker contracts were tested; no real-account Cloudflare deployment or registry publication was performed. Step 28B remains separate and unimplemented. Step 27 features absent from this checkout were not added.

After implementation, all three capability deltas were synchronized and checked against their main specifications. `pnpm exec openspec validate --specs --strict --no-interactive` passed all 50 accepted specifications.
