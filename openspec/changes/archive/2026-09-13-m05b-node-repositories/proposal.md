## Why

Step 4 defines portable content ports, and Session 5A provides their SQLite
schema, but the application still cannot run its content lifecycle against a
real Node database. Session 5B supplies the read and draft-write repository
boundary needed before the guarded publication work of Session 5C.

## What Changes

- Implement roadmap **Step 5, Session 5B — Node repositories** using the
  existing `better-sqlite3` connection factory and portable application ports.
- Add validated, versioned base64url cursors and bounded Node read queries for
  admin entry lists, public collection lists, public route/media lookup, and
  build export.
- Add atomic entry creation and complete-draft replacement, including block
  persistence, draft-media-reference projection rebuild, and one revision
  increment per successful save.
- Permit the Node platform adapter's direct public-entry-point dependencies on
  portable domain and content values, so it can map SQLite rows into the
  application contracts without moving runtime mapping into the shared schema
  package.
- Keep publication mutations out of the ordinary draft repository surface; the
  guarded publication transaction remains Session 5C scope.

## Capabilities

### New Capabilities

- `node-content-repositories`: Node/SQLite implementations of portable content
  reads and draft writes, including cursor paging and projection-efficient
  public reads.

### Modified Capabilities

- `application-ports-and-commands`: Complete-draft persistence inputs gain the
  validated media-reference projection, and public-read contracts gain explicit
  route and published-media lookups, so adapters never infer access or
  references by scanning arbitrary content JSON.

## Impact

- Affected code: `packages/application`, `packages/platform-node`, their package
  dependencies, the source-level boundary checker, and focused repository tests;
  shared database contracts are consumed, not widened for publication.
- Affected behavior: real SQLite persistence gains bounded admin/public reads,
  atomic create/save operations, draft-media-reference rebuilding, and build
  export. The change does not add REST, config synchronization, object storage,
  Cloudflare/D1 adapters, deletion, outbox processing, or publication.
- Architectural basis: `docs/mvp-architecture.md` sections 4.4–4.7, 6, 9–10,
  and 16; roadmap Step 5 / Session 5B; accepted
  `application-ports-and-commands`, `content-use-cases`, and
  `sqlite-schema-and-migrations` specifications.
- Dependencies: completed Session 4 portable domain/application contracts and
  completed Session 5A SQLite migration/schema plus Node connection factory.
