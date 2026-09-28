## Context

See proposal.md — Why. Relevant current state:

- `NodeContentRepository` (`packages/platform-node/src/content-repository.ts`,
  ~2,300 lines) implements every content, media, outbox, sync, and site-build
  port with raw prepared SQL inside `better-sqlite3` transactions. Roughly a
  fifth of it is runtime-neutral: cursor codecs (using `Buffer`), row mappers,
  hydration, usage grouping, sanitizers, and SQL fragments.
- Repository behavior tests live inline in `platform-node/src/index.test.mjs`
  and seed/inspect through the synchronous connection. No factory-driven suite
  exists in `@lacecms/test-utils`, and in-memory SQLite is not exercised despite
  the accepted contract spec.
- `@lacecms/platform-cloudflare` is an empty placeholder built with the Worker
  tsconfig (`lib: ES2024, WebWorker`, no Node types).
- The boundary checker already permits `@lacecms/db → application, domain`; it
  permits `platform-cloudflare → application, server, db, auth, config` only.
- D1 facts verified locally with Miniflare 5 (`convertV4MiniflareOptions`):
  batches are atomic and roll back on a runtime statement error; `?NNN`
  parameters and `VALUES` subqueries work; more than 100 bound parameters fail
  with `too many SQL variables`; foreign keys are enforced; `meta.changes`
  reports affected rows per statement. A `TEXT PRIMARY KEY` column without
  `NOT NULL` accepts NULL (SQLite quirk), so guard tokens must be `NOT NULL`.

## Goals / Non-Goals

**Goals:**

- One D1 adapter class with the same public method set and observable results
  as `NodeContentRepository`, verified by one shared contract suite.
- Every multi-row mutation is one `batch()`; conflicts are detected from the
  guard statement's affected rows, never from a read-then-write race.
- Keep Node behavior unchanged except the route-conflict error code.

**Non-Goals:**

- D1 security-service persistence (setup/API tokens, rate limits, users): it
  depends on Better Auth-on-D1 and moves to Session 22B (roadmap updated).
- Drizzle query builder for D1 queries; both adapters keep raw SQL so the SQL
  text stays shared and reviewable.
- A D1 migration runner; tests apply the checked-in SQL directly, and Session
  22C adds Wrangler migration commands.

## Decisions

### D1. Structural D1 binding types, no Workers type package

`platform-cloudflare` declares minimal `D1Database`, `D1PreparedStatement`, and
`D1Result` interfaces covering `prepare`, `bind`, `first`, `all`, `run`, and
`batch`. Miniflare's proxy and the real Worker binding satisfy them
structurally. Alternative: `@cloudflare/workers-types` — rejected for now; it
is large, changes globals, and 22B can adopt it without changing this adapter.

### D2. Batch-unique guard rows for conditional multi-statement mutations

A guarded mutation is `[insert guard where <precondition>, …statements each
requiring exists(guard), delete guard]`. The precondition is evaluated inside
the serialized batch, so it is the D1 equivalent of Node's re-check inside the
transaction. `results[0].meta.changes === 0` means the precondition failed; the
adapter then performs a classification read (outside the batch) only to choose
the error code, never to decide whether to write. The guard token is
`crypto.randomUUID()`-based, so an earlier or concurrent batch can never satisfy
another batch's `exists` check, and the final delete leaves no committed row.

Used by: complete-draft save (revision and draft pointer), deletion, media
mark/retry, media deletion completion/failure, site-build acceptance/success/
failure, manual/retry build request, and configuration sync apply.

Alternatives considered:

- *Re-evaluate the same precondition in every statement.* Works only while no
  earlier statement changes it (true for save, false for sync rename, media
  finalization, and lease completion). One mechanism is easier to audit.
- *Abort through an intentional error* (`json('x')`, CHECK violation). Loses
  the affected-row signal the roadmap requires and conflates conflicts with
  genuine failures.
- *`changes()` chaining.* Refers only to the immediately preceding statement and
  breaks as soon as a statement legitimately changes zero rows.
- *Reuse `idempotency_records` as the guard table.* Avoids a migration but
  overloads a table with externally meaningful records.

### D3. Publication uses its own new snapshot as the guard

Publication needs no guard row: the new snapshot ID is unique, so the batch is
`INSERT … SELECT` of the snapshot (joined through `content_entries.draft_snapshot_id`,
filtered by expected revision and, when an idempotency key is supplied, by the
absence of a stored record), followed by statements each filtered by
`exists(select 1 from content_snapshots where id = :new)`, in architecture §10
order: blocks, references, route delete + insert, published pointer, published
state upsert, build enqueue/coalesce, idempotency record, delete every other
non-draft snapshot of the entry, then a `select` returning the new version.

The committed entry (for the return value and idempotency response) is built
in JavaScript from the pre-read draft — valid because the guard proves the draft
revision, and every draft mutation bumps it — plus the publisher's stored role.
A route primary-key collision aborts the batch and is mapped to
`CONTENT_ROUTE_CONFLICT`. A zero-row snapshot insert re-reads the idempotency
record: present → replay (or fingerprint-mismatch failure); absent → revision
conflict. Node receives the same route-conflict mapping.

### D4. Build enqueue in SQL

Published-state increment and build coalescing cannot read intermediate values
in JavaScript, so both are SQL: `insert … on conflict do update` for
`published_state`; `insert or ignore` of a new `site.build.requested` event whose
`payload_json` is `json_patch(json_object(…, 'targetVersion', (select version …)),
json_object('retryOfBuildId', :retry))` (a JSON Merge Patch null drops the key);
then an update of the pending unlocked event (other than the new ID) that
refreshes payload, debounce time, and `retryOfBuildId` from the old payload when
absent; then a `select` of the pending event ID and version. `coalesced` is
`pendingId !== newId`.

### D5. Chunking and budgets

Block inserts bind snapshot ID, timestamp, and guard token once (`?1..?3`) and
five values per block, so 19 blocks per statement; references bind three values
per row, 32 per statement. A 200/200 save is `guard + 2 deletes + 11 + 7 +
entry update + snapshot update + guard delete = 24` batch statements plus four
reads, under the 50-query free-plan budget. Media validity inside a reference
chunk uses `(select id from media where id = v.media and status = 'active')` for
the non-null `media_id`, so unavailable media raises a `NOT NULL` error that
rolls back the batch (mapped to "Media is unavailable for reference."). `IN`
lists in reads chunk to 100 identifiers. The 200-block and 200-reference caps
are checked by a shared helper in both adapters.

### D6. Claims

Dispatcher and site-build claims select candidates, then send one batch of
single-statement, self-guarded lease updates (media: one statement per row;
site builds: the lease update also requires the payload text that was read, and
is followed by a site-build row insert or invalid-event completion filtered by
`locked_by = :leaseId`, a natural unique marker). Leases are returned only for
statements whose `changes === 1`. Claim limits stay ≤ 10 in dispatchers; the
adapter rejects any batch that would exceed 45 statements.

### D7. Configuration sync guard

The state read returns both parsed rows and the SQL-rendered state JSON
(`json_group_array` over the ordered aggregate). The guard precondition compares
the same SQL expression with that exact string, avoiding JavaScript/SQLite JSON
formatting differences. Stale plans, concurrent applies, and unsafe operations
behave as in Node; creates rely on primary/singleton uniqueness errors.

### D8. Shared SQLite-dialect helpers in `@lacecms/db`

`packages/db/src/sql-content.ts` (exported from the package root) owns cursor
codecs (base64url via `btoa`/`atob` and `TextEncoder`, byte-identical to
`Buffer` base64url), row types and mappers, hydration from snapshot/block rows,
media usage grouping, sanitizers, validation helpers, SQL fragments, and the
draft persistence caps. `@lacecms/db` gains `application`, `domain`, and
`content` dependencies (boundary map adds `content`). Both adapters import it;
SQL execution and atomicity stay in each adapter. Alternative: duplicate the
helpers in the D1 adapter — rejected because the suite would catch drift only
after it happened.

### D9. Contract suite shape

`@lacecms/test-utils` exports `contentRepositoryContractCases`: named async
cases taking `(factory, expect)`. The factory returns `{ repository, reopen,
sql, close }` where `sql.run/get/all` are async parameterized helpers and
`reopen(options)` constructs an independent repository over the same database.
Runtime tests loop over the cases (`test(\`<runtime>: ${name}\`)`), so Node
file, Node in-memory, and D1 run identical code. Existing Node lifecycle tests
move into the suite; Node-only checks (WAL/foreign-key pragmas, query-plan
indexes, better-sqlite3 prepare-count bounds) stay in `index.test.mjs`.

### D10. D1 checkpoint injection happens inside the batch

The D1 adapter calls the optional `beforeMutation(name)` hook while building a
batch at the same named points as Node. If the hook throws, the adapter appends
`insert into mutation_guards (token, created_at) values (null, 0)` at that
position and keeps building, so the failure occurs during batch execution after
earlier statements ran — proving rollback rather than merely skipping the call.
The resulting error maps to `CONTENT_INVALID_STATE` like Node.

### D11. Test runtime

Tests use `miniflare` (dev-only, catalog `5.20260903.0-alpha`, the exact
dependency of the pinned `wrangler@4.129.0`) with an in-memory D1 per case,
apply `packages/db/drizzle/*.sql` split on `--> statement-breakpoint`, and
dispose the instance afterwards.

## Risks / Trade-offs

- [Local D1 differs from production D1 on limits] → Budgets are enforced by the
  adapter itself and asserted by tests with a counting binding wrapper.
- [Miniflare 5 is an alpha-tagged release] → Dev-only, exact pin matching
  wrangler; production code depends only on the structural binding.
- [JS-built committed entry could drift from a reload] → The contract suite
  compares publish results with a subsequent `load` in every runtime.
- [Guard classification read races] → It only chooses between two error codes
  after the batch already refused; no write depends on it.
- [Shared helper refactor could change Node behavior] → The full Node suite and
  API tests run before and after; cursor codec byte-equality is tested.

## Migration Plan

Add `mutation_guards` to the Drizzle schema, generate
`0002_*.sql` with `pnpm db:generate`, and apply it with the existing
`pnpm db:migrate:node`. The table is empty outside batches, so rollback is a
database restore or a later forward migration dropping it, per
`docs/database-migrations.md`.
