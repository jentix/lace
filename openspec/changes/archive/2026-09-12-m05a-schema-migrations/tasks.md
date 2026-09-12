## 1. Database migration foundation

- [x] 1.1 Add the pinned Drizzle SQLite, migration-generation, and Node driver dependencies plus focused `@lacecms/db` and root database scripts; verify the workspace installs with the committed lockfile and exposes explicit generation/migration commands.
- [x] 1.2 Configure Drizzle to generate checked-in, forward-only SQLite migration assets from `@lacecms/db`; verify generation produces the initial migration and metadata without uncommitted drift.

## 2. Shared relational schema

- [x] 2.1 Define and export the shared SQLite tables for content aggregates, published routing/state, media and references, outbox/build history, idempotency, installation/setup/API tokens, rate-limit buckets, and pinned Better Auth records; verify schema tests cover valid representative rows and rejected finite-state values.
- [x] 2.2 Encode the specified foreign-key actions, checks, unique constraints, dispatcher lease columns, and named partial indexes; verify focused SQL tests reject singleton/route/idempotency conflicts and enforce cascade, restrict, and pointer-clear behavior.
- [x] 2.3 Generate and review the first migration SQL and expose a read-only installed-migration metadata/version query; verify a clean database reports the applied initial migration after migration.

## 3. Node SQLite initialization

- [x] 3.1 Implement the `@lacecms/platform-node` SQLite connection factory using the shared migration assets and enabling foreign keys plus WAL before use; verify a reopened file-backed connection reports both invariants.
- [x] 3.2 Add an empty-file migration/reopen integration test that checks required tables and indexes, rejects a foreign-key violation, and preserves the portable shared migration SQL from Node-only pragmas.

## 4. Quality gates and documentation

- [x] 4.1 Document the explicit Node migration/version-inspection workflow and forward-only recovery boundary; verify the documented root command runs against a temporary SQLite file.
- [x] 4.2 Run the focused package and migration tests, then `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm exec openspec validate m05a-schema-migrations --type change --strict`; resolve every failure before marking this task complete.
