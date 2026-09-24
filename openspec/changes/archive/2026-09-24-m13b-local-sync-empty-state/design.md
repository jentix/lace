## Context

See proposal.md. The portable application package already plans, reports, and prepares sync, and the Node repository guards atomic application against stale state. `apps/api/src/project-config.ts` loads the fixed root module. Compose keeps SQLite in a named volume mounted in the API container; the browser model endpoint returns configured models even before persistence, but does not return persisted model identities.

## Goals / Non-Goals

**Goals:** Reuse those boundaries for one explicit local operator command and provide accurate browser guidance with the data already exposed.

**Non-Goals:** Cross-environment production CLI, mutation over HTTP, a new sync-status endpoint, automatic migration, and Astro presentation changes.

## Decisions

1. **Run sync within the existing local API container.** A root script delegates to the fixed `lace-dev` Compose project, using the API container's mounted database and dependencies. The API command imports the same fixed root config as startup and invokes a Node platform helper that calls `prepareConfigurationSynchronization`, prints its canonical human report, then calls `applyPreparedConfigurationSynchronization` with Node clock and IDs. This keeps the API composition root within its enforced dependency boundary. A host command that opens the named-volume SQLite file or creates a second data path is rejected. Explicit `--check` makes no apply call and uses the planner's exit code. Invalid plans print diagnostics and exit before apply; a stale plan reports a retry instruction, with repository rollback intact.
2. **Keep the command local and simple.** Accept only no option or `--check`; reject all other arguments. Do not select a config or database path from HTTP. Compose environment supplies `LACE_DATABASE_PATH`, and migrations must already have run through `dev:node`. The command closes the database even on error. Node persistence remains the atomic boundary; portable packages gain no Node dependency.
3. **Use observed Admin states.** An empty successful model list means no configured models; a failed request remains an error. A configured page with no singleton entry is evidence of a missing sync or inconsistent local data, so show the sync command. A collection's empty entry list alone cannot prove its identity is synchronized, because the API exposes only configured models and content entries. Keep the create affordance permission-aware and give cautious guidance for a first local collection.

## Risks / Trade-offs

- **Config changes after the API started** → The CLI imports current disk config while the API holds its startup snapshot. Require an API restart in the guide before syncing and after edits; no silent refresh.
- **A contributor runs against an unstarted or unmigrated stack** → Fail with a clear start/migration instruction; do not initialize schema or silently start services.
- **A plan becomes stale between display and apply** → The Node repository re-reads inside the transaction and rolls back; CLI reports that the contributor should rerun sync.
- **Collections do not expose identity status to the browser** → Describe the uncertainty instead of claiming success or failure from an empty entry list.

## Migration Plan

No SQL migration. Existing local databases are changed only by explicit sync. Reverting the command and UI does not undo already synchronized content models; operators retain their SQLite volume.
