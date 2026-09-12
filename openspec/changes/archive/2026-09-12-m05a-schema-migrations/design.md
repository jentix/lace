## Context

See [proposal.md](./proposal.md) for the motivation. The workspace already has
portable domain and application contracts, while `@lacecms/db` and
`@lacecms/platform-node` are placeholders. Architecture section 9 specifies
the relational records and actions; sections 14 and 16 add security records,
SQLite/D1 portability, and Node-only connection configuration. Session 5B will
add repositories, so this session must expose schema and migration primitives
without taking ownership of read/write use cases.

## Goals / Non-Goals

**Goals:**

- Make one ordered, forward-only initial SQLite migration the source of
  deployed database structure.
- Keep shared table definitions and migration SQL in `@lacecms/db`, with a
  schema usable by both Drizzle SQLite and D1 adapters.
- Keep Node driver construction and per-connection pragmas in
  `@lacecms/platform-node`.
- Prove a clean file can migrate, reopen, report its migration state, enforce
  foreign keys, and use WAL.

**Non-Goals:**

- Implement application persistence ports, publication batches, D1 execution,
  token issuance, authentication flows, or outbox dispatching.
- Provide rollback migrations; the architecture promises forward migrations
  only.
- Add indexes for unplanned JSON filtering or duplicate the executable content
  configuration in SQL.

## Decisions

### One shared SQLite schema with explicit application and auth ownership

`@lacecms/db` will define all Lace tables from architecture sections 9 and 14,
including SQL constraints, foreign-key actions, and named focused indexes. It
will also expose the Better Auth SQLite table definitions required by the
provider so both participate in the same migration history. JSON values remain
`TEXT`, IDs remain `TEXT`, and UTC timestamps remain integer milliseconds.

The schema will not create tenant columns, binary fields, schema-specific block
tables, or a `previousPublished` relation. This preserves the single-site,
portable, two-snapshot model.

Alternative considered: defer authentication and operational tables until their
features are implemented. Rejected because Session 5A explicitly includes
them, and a first migration must establish the compatibility boundary rather
than retrofitting fundamental installation/security records later.

### Encode database-level safety where SQL is the final consistency boundary

The migration will use schema-level checks, foreign keys, unique constraints,
and named partial indexes for page cardinality and unclaimed pending
site-build events. It will include entry-list, route, ordered-block,
media-reference, outbox-availability, and build-history indexes. Dispatcher
lease columns are nullable state rather than a separate lease table.

Entry snapshot pointers will use `ON DELETE SET NULL` to break their cyclic
insertion/deletion relationship; application repositories in later sessions
will ensure committed entries always regain exactly one draft. Other actions
will follow architecture section 9.9 exactly so application logic cannot leave
orphaned block/reference/route data.

Alternative considered: enforce cardinality, routes, and all referential
cleanup only in repositories. Rejected because concurrent writers and direct
SQL execution need the same final guarantees.

### Generate checked-in forward migration assets and query them directly

The change will add the required Drizzle generation configuration and package
scripts, generate an initial numbered migration plus metadata, and check both
into version control. `@lacecms/db` will offer migration application and a
read-only installed-version query based on migration metadata. The migration
uses only SQLite syntax supported by D1; Node pragmas never appear in it.

Alternative considered: create the schema imperatively at startup. Rejected
because it cannot provide explicit deployment ordering or an auditable
migration-version report.

### Initialize Node connections at the Node composition boundary

`@lacecms/platform-node` will own creation/opening of `better-sqlite3`
connections and set `PRAGMA foreign_keys = ON` and `PRAGMA journal_mode = WAL`
before exposing the connection or Drizzle client. Tests will reopen a file to
verify the initialization happens for each connection, rather than relying on
one process-global setting.

Alternative considered: embed pragmas in migrations or shared table modules.
Rejected because foreign-key enforcement is connection-specific and WAL is a
Node storage configuration, neither of which belongs in D1-compatible schema
SQL.

### Test migration behavior against a temporary SQLite file

Focused tests will migrate an empty temporary file, inspect migration metadata
and declared indexes, close and reopen it through the Node initializer, then
assert `foreign_keys` and `journal_mode` plus a failed violating insert. This
covers the 5A boundary without depending on the repositories scheduled for 5B.

Alternative considered: use only in-memory SQLite. Rejected because WAL and
reopen behavior are properties of file-backed Node databases.

## Risks / Trade-offs

- [Drizzle-generated SQL can contain unsupported D1 syntax] → inspect the
  generated migration and keep definitions to the SQLite/D1 subset before
  committing it.
- [Better Auth schema requirements can change with its pinned version] → derive
  tables from that pinned package's documented Drizzle SQLite adapter shape and
  cover initial migration application in tests.
- [Foreign-key actions can conflict with the draft-pointer cycle] → use the
  specified `SET NULL` pointer actions and exercise entry/snapshot removal in
  migration-level tests.
- [Node connection options can be skipped by a future caller] → export one
  documented Node database factory and test its reopened-connection behavior.

## Migration Plan

1. Add the pinned database/migration dependencies and workspace scripts needed
   to define, generate, and apply the initial schema.
2. Define the shared tables, constraints, indexes, and exported migration
   helpers in `@lacecms/db`; generate and review the first migration assets.
3. Add the Node SQLite factory in `@lacecms/platform-node` to set connection
   pragmas before migration/use.
4. Add focused fresh-file/reopen tests and run package tests followed by root
   typecheck, Oxlint, Oxfmt check, and strict OpenSpec validation.
5. Deploy by running the explicit forward migration command before starting a
   runtime. There is no automatic downgrade; recovery uses a database backup
   and a corrected later forward migration.
