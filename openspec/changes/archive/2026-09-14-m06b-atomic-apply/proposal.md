## Why

Step 6A can decide whether a normalized content configuration is safe to
synchronize, but it cannot commit that decision. Lace must now apply a valid
plan against freshly read persistence state so a stale plan, a concurrent sync,
or a failed write cannot leave model identity, page content, public version, and
build work out of agreement.

## What Changes

- Implement roadmap **Step 6, Session 6B — Atomic apply** with a specialized
  portable configuration-sync read/apply contract and a SQLite implementation.
- Re-read stored model identity and snapshot summaries inside the guarded
  mutation; reject invalid, stale, or changed plans without writing content.
- Atomically create, update, rename, and remove model identities. A valid
  explicit rename updates the model key and its foreign keys through the schema
  cascade; no rename is inferred.
- Create exactly one draft-only singleton entry for each newly added page using
  its label, normalized defaults, empty blocks, and `system:content-sync` audit
  actor.
- When an operation changes the public configuration projection, advance
  `published_state` and coalesce one `site.build.requested` outbox event in the
  same transaction. A valid no-op changes nothing.
- Add focused dry-run, apply, repeat-apply idempotency, rollback, and
  concurrent-sync coverage. **BREAKING:** replace the current
  planner-only synchronization boundary with the specialized apply boundary.

## Capabilities

### New Capabilities

<!-- None. -->

### Modified Capabilities

- `configuration-synchronization`: apply a validated plan atomically against
  fresh stored state, create new page singletons, and emit public build work
  only for public projection changes.
- `application-ports-and-commands`: expose guarded configuration-sync read and
  apply contracts without database rows or generic transaction callbacks.
- `node-content-repositories`: implement the SQLite read/apply operation with
  rollback and concurrent guard behavior.

## Impact

- Affected code: `packages/application`, `packages/platform-node`,
  `packages/test-utils`, and focused Node/application tests; existing schema
  foreign-key cascade and outbox constraints are reused without a migration.
- Externally visible outcome: callers can safely dry-run and apply an approved
  configuration synchronization plan, while unchanged or failed plans preserve
  all stored data. A command-line entry point, REST/admin wiring, Cloudflare/D1
  adapter, and arbitrary content migrations remain out of scope.
- Architectural basis: `docs/mvp-architecture.md` sections 4.3, 4.4, 4.7, 8,
  9.9, and 10; roadmap Step 6 / Session 6B; accepted
  `configuration-synchronization`, `application-ports-and-commands`, and
  `node-content-repositories` specs.
- Dependencies: the archived `m06a-configuration-sync-planner` change and its
  stable normalized model hashes and planner operations.
