## Context

Session 17A supplies the contracts that the Step 17 shell (17B) and collection
table (17C) render. The current pieces are:

- `@lacecms/config` normalizes models. `omitDisplayMetadata` removes every
  `label` and `description` before computing `structureHash`, and
  configuration sync treats a projection-only change as a `label-update`.
- `@lacecms/contracts` defines `contentEntrySummarySchema` (ID, model key,
  title, draft revision, optional published snapshot ID, `updatedAt`) and a
  generic `cursorPageSchema`. One `contentEntrySchema` serves admin, public,
  and build-export responses, and its snapshots carry `updatedBy` as
  `{ id, role }`.
- `ContentUseCases.list` authorizes `content:read` and forwards
  `{ after, limit, modelKey }` to `ContentEntryReadPort.list`.
- `NodeContentRepository.list` joins the draft snapshot and orders by
  `(updated_at DESC, id DESC)` with a version 1 cursor
  `{ id, kind: "admin", timestamp, version }`.
- `InMemoryContentStore` in `@lacecms/test-utils` is the reference adapter
  behind the server tests. It uses offset cursors with a string prefix.
- Publication copies the draft row, including its `revision`, into a new
  published snapshot whose `created_at` is the publication time. A later draft
  save increments only the draft revision.
- Users live in the `user` table. `name` is set to the email at creation, and
  no display-name editing exists. Sync-created page singletons use the audit
  actor `system:content-sync`.

## Goals / Non-Goals

**Goals:**

- Collections declare `listFields`. Configuration validates them, and the
  admin sees them without a version bump or a structural sync change.
- One summary read returns slug, derived status, publication time, the last
  editor's name, list values, and per-status totals.
- Server-side search, status filter, and sort, with cursors that cannot mix
  queries.
- Admin entry responses name the last editor. Public and build DTOs never carry
  personal names.
- Node and in-memory adapters return identical semantics.

**Non-Goals:**

- Shell, table, or filter UI; editable display names; Unicode case folding or
  full-text search; new indexes for non-default sorts; Cloudflare D1 adapter
  code (not implemented yet; the SQL stays D1-compatible).

## Decisions

### D1 — `listFields` is collection presentation metadata

`CollectionModelInput` gains
`listFields?: readonly (keyof Fields & string)[]`. `defineCollection` validates
the value after normalizing fields. It must be an array of unique strings, each
naming a declared field whose type is in
`LIST_FIELD_TYPES = text | textarea | number | boolean | select | date |
datetime | url`. Rich text is a document and media is an opaque ID, which would
put an internal identifier in a list, so both are rejected. An empty array
normalizes to an absent property. Existing collections therefore keep
byte-identical projections and hashes.

The structural hash removes `listFields` from each model before applying
`omitDisplayMetadata`. The removal is top-level only, so a field key
coincidentally named `listFields` is unaffected. This happens in both the
per-model hash and the complete-configuration hash. The projection hash keeps
`listFields`, so the existing sync planner classifies a list change as
`label-update`, with no planner change.

*Rejected:* including `listFields` in the structural hash. A list tweak would
then need a version bump and would be refused while snapshots exist
(`STRUCTURE_CHANGE_HAS_SNAPSHOTS`), which is wrong for presentation. Also
rejected: allowing `listFields` on pages, since a singleton has no list.

### D2 — Status is derived from revisions, not stored

`status = published_snapshot_id IS NULL ? draft : p.revision = d.revision ?
published : changed`, where `publishedAt = p.created_at`. Publication copies
the draft revision into the published snapshot, and every draft save
increments the draft revision, so equality means that the published content
equals the draft. No migration or denormalized column is needed. SQLite and D1
evaluate the same `CASE` expression.

### D3 — Summary shape and naming

`ContentEntrySummary` (application) and `contentEntrySummarySchema` (contracts)
gain `slug?`, `status`, `publishedAt?`,
`updatedBy: { id, displayName }`, and `listValues`. The field is named
`listValues` rather than `fields` so that clients cannot mistake it for the
complete field map. A `v.check` enforces status consistency: `draft` has
neither `publishedSnapshotId` nor `publishedAt`, and the other statuses have
both. `listValues` is a record of `string | number | boolean`. The adapters
copy only requested keys that are present with scalar values, since a draft may
still hold legacy or invalid data.

`contentEntryListSchema` becomes
`strictObject({ items, nextCursor?, totals })`, where `totals` is
`{ all, changed, draft, published }` of non-negative integers. The totals apply
the search term but not the status filter or cursor, so filter tabs can show
counts for the current search. The application port returns
`ContentEntryListPage extends CursorPage<ContentEntrySummary>` with `totals`.

### D4 — Query semantics shared by both adapters

`ListContentEntriesInput` gains
`listFields: readonly string[]`, `q?: string`, `status?: ContentEntryStatus`,
and `sort: ContentEntrySort`.

- **Search:** transport and use case trim `q`; an empty term becomes
  undefined, and the maximum is 200 characters, matching the title limit.
  Adapters fold only ASCII `A–Z` to lowercase (`foldAscii`, exported from
  application) and match
  `instr(lower(d.title), ?) > 0 OR instr(coalesce(d.slug, ''), ?) > 0`.
  SQLite's `lower()` folds only ASCII, so folding the term the same way keeps
  Node, D1, and the in-memory store identical. `instr` with a bound parameter
  avoids `LIKE` wildcard escaping, which the literal-term scenario requires.
- **Sort:** the values are `updatedAt`, `title`, and `publishedAt`, each with
  an optional `-` prefix; the default is `-updatedAt`. The sort keys are
  `e.updated_at`, `d.title COLLATE NOCASE`, and `coalesce(p.created_at, -1)`,
  with `e.id` as the tie-breaker in the same direction. Mapping `-1` makes
  never-published entries the earliest, so they come last when descending and
  first when ascending, while keyset comparison stays total.
- **Status filter:** implemented with the same `CASE` expression in `WHERE`.

*Rejected:* offset pagination for the Node adapter, because it is unstable
under concurrent edits. Also rejected: `LIKE` with escaping, which has more
edge cases for the same result.

### D5 — Query-bound version 2 cursors

The Node admin list uses a separate codec. `encodeEntryCursor` produces
`base64url(JSON { id, kind, value, version: 2 })`, where
`kind = JSON.stringify(["entries", modelKey, sort, status ?? null, q ?? null])`.
The kind comparison rejects a cursor reused with another model, search, filter,
or sort. `value` must be a string of at most 200 characters for title sort, or
a safe integer of at least -1 for time sorts. The decoder requires exactly four
keys, checks the version, kind, and value type, and throws the existing
`CONTENT_INVALID_STATE` error, which the server maps to `422` before any query
runs. Version 1 `admin` cursors are no longer accepted; clients restart from
the first page. The public and media cursor codec is unchanged.
`InMemoryContentStore` keeps offset cursors, with the same JSON kind as its
prefix, so it also rejects cross-query reuse.

### D6 — Display names resolve in the adapter, fallbacks in application

Application exports `actorDisplayName(id, storedName)`. It returns a non-empty
trimmed stored name, else `System` for IDs starting with `system:`, else
`Unknown user`. The Node list query selects `u.name` with
`LEFT JOIN user u ON u.id = d.updated_by` in the same statement, so there are
no N+1 reads. `ContentEntryReadPort` gains
`describeActors(ids): Promise<readonly ActorSummary[]>`, which returns one
summary per requested ID in order. Node implements it with a bounded
`select id, name from user where id in (…)`. The in-memory store accepts seeded
names through `setActorDisplayNames`.

`ContentUseCases.describeActor({ actor, actorId })` requires `content:read`.
The server's admin entry routes (load, create, save, publish) call it for
`entry.draft.updatedBy.id` and map the result with
`toAdminContentEntryDto(entry, updatedBy)`, which is
`{ ...toContentEntryDto(entry), updatedBy }`.

`adminContentEntrySchema` extends the entry entries with a top-level
`updatedBy: actorSummarySchema`. `publishContentEntryResultSchema.entry` uses
it. Public routes, SDK, and build export keep `contentEntrySchema`, so a
display name, which is currently an email, never reaches a public build.

*Rejected:* adding `displayName` to the domain `Actor` or snapshot
`updatedBy`. That would change the portable domain value, which also drives
authorization, and the public and export DTOs. Also rejected: resolving names
in the admin through the admin-only users API, because viewers cannot call it.

### D7 — Transport and OpenAPI

A new `contentEntryListQuerySchema` (a loose `v.object`, because unknown query
keys stay ignored as elsewhere) validates optional `q` (string of at most 200
characters after trimming, through a pipe), `status` and `sort` picklists,
`limit`, and `after`. The list route attaches it with
`validator("query", …, validationHook)`. Failures therefore use the standard
`VALIDATION_FAILED` envelope with `/q`, `/status`, or `/sort` pointers, and
`hono-openapi` documents the parameters. The route also gains a documented
`200` response of `contentEntryListSchema`, and the entry routes document
`adminContentEntrySchema`. The existing `pagination()` still enforces the
numeric `limit` range. `apps/api/openapi/api-v1.json` is regenerated.

### D8 — Admin client and fixtures

`createAdminClient` parses entry responses with `adminContentEntrySchema`, and
`listEntries(modelKey, options?)` accepts `{ cursor?, q?, status?, sort? }`.
Admin UI behavior does not change in 17A. Existing test fixtures gain the new
required fields. The reference `lace.config.ts` declares
`listFields: ["category", "author"]` on `posts` so that 17C and local sync
exercise it. Local sync reports a projection-only update.

## Risks / Trade-offs

- **Non-default sorts scan the model's entries** → The scan is bounded by one
  model's entries, which is acceptable for the MVP single site. The default
  sort keeps its index, verified by a query-plan test. Indexes can be added
  just in time if lists grow.
- **Display name equals email today** → The admin is authenticated and every
  role already collaborates on content. Public DTOs exclude it (D6). Editable
  names are a later change.
- **ASCII-only case folding** → This is documented in the spec. Non-ASCII
  titles still match case-sensitively and consistently across runtimes.
- **Breaking admin DTO change** → Only the bundled admin consumes it, and it is
  updated in the same change. Stale version 1 cursors fail once with `422`.
- **Two adapters to keep in sync** → Server tests run against the in-memory
  store and repository tests against Node. Both assert the same status, totals,
  sort, and cursor scenarios.

## Migration Plan

No schema migration. After deployment, run `pnpm content:sync` so that
collections declaring `listFields` record the new projection hash; this is a
`label-update`. Rollback is a plain code revert, because nothing persistent
changes shape.

## Open Questions

None.
