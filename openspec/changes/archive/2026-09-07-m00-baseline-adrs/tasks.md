## 1. Resolve and prove the dependency baseline

- [x] 1.1 Query the authoritative release channels immediately before implementation and record the exact stable releases selected for Node LTS, pnpm, TypeScript, Turborepo, `@fission-ai/openspec`, Oxlint, Oxfmt, Hono, Valibot, Drizzle, Better Auth, Astro, React, Vite, Wrangler, Vitest, and Playwright; verify the recorded source URLs and selection date are present in `docs/compatibility.md`.
- [x] 1.2 Create a disposable isolated pnpm smoke workspace using the selected Node LTS and exact package versions, install it with a frozen lockfile, and verify package resolution plus representative TypeScript/framework imports; include the native `better-sqlite3` compatibility check and retain only a concise documented result after removing the temporary workspace.
- [x] 1.3 Add the minimal root pnpm package metadata, package-manager declaration, catalog pins, and committed lockfile for the smoke-tested set, including a local `@fission-ai/openspec`; verify `pnpm install --frozen-lockfile` succeeds from a clean checkout and `pnpm exec openspec --version` resolves the pinned local CLI.

## 2. Document compatibility and pre-release security

- [x] 2.1 Add `docs/compatibility.md` that distinguishes exact smoke-tested and CI-used versions from the supported Node, pnpm, SQLite, Wrangler, and browser ranges; verify every required Step 0 tool/library and range is listed and the document does not claim support that has not been tested.
- [x] 2.2 Add `SECURITY.md` with an explicitly labelled private vulnerability-reporting placeholder, coordinated-disclosure guidance, and the pre-release/no-supported-version statement; verify it contains no invented contact address or support-time commitment.

## 3. Record architectural decisions

- [x] 3.1 Add the package-boundary ADR under `docs/adr/`, citing architecture section 6 and documenting dependency direction and the rejection of cross-package source-path imports; verify all architecture package groups and their constraints are represented without adding new product behavior.
- [x] 3.2 Add the D1-versus-Node transaction ADR, citing architecture section 10 and documenting guarded atomic D1 batches, interactive Node SQLite transactions, known-operation application ports, and the rejected generic D1 callback; verify its atomicity and concurrency statements match the architecture.
- [x] 3.3 Add the media-reference and asynchronous deletion ADR, citing architecture section 9.7 and documenting relational projection, atomic draft/publication handling, outbox deletion lifecycle, retryability, and rejected direct object deletion; verify it preserves the no-binary-in-SQL and no-dangling-reference invariants.
- [x] 3.4 Add the fixed-command VPS builder ADR, citing architecture sections 5 and 13, documenting private authenticated triggering, fixed image-defined command and mount paths, rejection of caller overrides, atomic release switching, and rejected arbitrary-command/CI-only alternatives; verify it does not expose a public command-execution path.

## 4. Verify the planned baseline

- [x] 4.1 Review the changed documentation and root metadata against roadmap Step 0 and architecture sections 4.5, 5, 6, 9.7, 10, 13, 18, 19, and 22; verify no Step 1 workspace scaffolding, product code, database changes, public packages, or deployment resources were added.
- [x] 4.2 Run the root frozen install smoke check and `pnpm exec openspec validate m00-baseline-adrs --type change --strict`; verify both commands succeed and retain their output in the implementation report.
