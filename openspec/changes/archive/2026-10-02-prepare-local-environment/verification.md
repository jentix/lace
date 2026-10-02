# Step 26C verification

Verified on 2026-10-02 in branch `codex/step-26-reliable-local-setup`.

- `pnpm --filter @lacecms/cli test`: 19 files, 146 tests passed. New preparation coverage includes arguments, both output modes, independent credentials, unchanged non-secret template bytes/CRLF, invalid templates, symlinks/directories/FIFO, protected output, repeat preservation, real process concurrency, publication race injection, write/sync/link failure cleanup, denied directory access and forced termination before publication.
- `pnpm --filter create-lace test`: 2 files, 12 tests passed, including the generated Astro build. Local HTTP tests were rerun with sandbox permission. `src/index.test.mjs` was also rerun after script/guide assertions were added: 9 tests passed.
- `node scripts/generated-project-acceptance.mjs snapshots --update`: default and optional Cloudflare snapshots updated and verified across two byte-identical regenerations each.
- `node scripts/generated-project-acceptance.mjs packages`: passed with sandbox permission for isolated dependency installation. Installed 12 Lace tarballs outside the source workspace; frozen offline reinstall and dependency resolution isolation passed. The generated preparation script ran before `.env` existed, generated service-compatible values, preserved non-secret bytes, left the build token empty, used mode 0600, and emitted no secrets. Repeat returned one sanitized error object with exit 6 and preserved file bytes. Initial/repeat packaged migrations then succeeded without changing `.env`.
- Root `pnpm typecheck`, `pnpm lint`, `pnpm format:check` and `pnpm exec openspec validate prepare-local-environment --type change --strict`: passed.

No database migration or external publication/deployment is required. This verification uses packages freshly packed from the implementing revision; it does not assert previously published alpha artifacts contain the new command. Coherent version refresh remains Step 32B.
