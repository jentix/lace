## Why

Step 26 — Reliable local setup and CLI diagnostics, session **26A — Fresh SQLite migration**, fixes the confirmed onboarding failure in `docs/onboarding-feedback.md` §2: the generated `./.lace/data/lace.sqlite` path cannot be migrated until an operator creates its parent directory. Steps 23–25 already provide explicit migration and packaged consumer delivery; their migration path needs to work on a fresh installation.

## What Changes

- Explicit Node migration recursively creates missing parent directories before opening a file-backed SQLite database, preserving existing directories and stored data.
- `:memory:` skips filesystem preparation; API startup remains an explicit-migration consumer.
- Verify fresh nested paths, repeated migration, existing data and failed directory creation through the runtime migration entry and an isolated packed CLI consumer.
- Remove acceptance's pre-created database directory and document the normal migration flow instead of the manual `mkdir -p` workaround, recording the fix in onboarding feedback after verification.
- Scope is only 26A. Actionable error redesign (26B), environment preparation (26C), doctor, README restructuring, version refresh, publication and remote deployment are excluded.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `sqlite-schema-and-migrations`: define filesystem preparation at the explicit Node migration boundary, including memory and failure behavior.
- `operational-cli`: require fresh nested Node migration without directory preparation, preserving existing output and failure contracts.

## Impact

- Authority: `docs/mvp-architecture.md` §§4.8, 6, 7, 16, 21–22; accepted `sqlite-schema-and-migrations` and `operational-cli` specs. Supporting onboarding/acceptance contracts remain applicable without changes to their broader workflows.
- Implementation: `packages/platform-node/src/index.ts` owns the shared migration function used by `packages/platform-node/src/migrate.ts` and `packages/cli/src/migrate.ts`. Keep directory preparation out of the general connection opener and Cloudflare packages.
- Verification: focused runtime/CLI tests and isolated package-consumer coverage; `scripts/generated-project-acceptance.mjs` currently creates `.lace/data` before migration and masks this regression.
- Documentation: generated `packages/create-lace/templates/docs/lace-operations.md`, its affected snapshots, and feedback §2. No new dependencies, SQL migrations, public DTOs or CLI flags are required. Previously published alpha artifacts and historical acceptance evidence are not rewritten.
