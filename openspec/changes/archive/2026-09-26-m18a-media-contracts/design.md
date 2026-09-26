## Context

Session 18A supplies the contracts that the Step 18 library (18B) and picker
(18C) render. The current pieces are:

- `MediaUseCases` (`@lacecms/application`) validates uploads, asks the
  `ImageInspector` port for dimensions, writes the object, and then creates
  metadata. `list` forwards only `{ after, limit }` to `MediaListPort`, and
  `get` exists but no route exposes it. `MediaView` carries `createdBy` as a
  raw actor ID.
- `NodeSharpImageInspector` returns sharp's `metadata().width/height`. Those
  are stored pixel dimensions: sharp documents that they ignore EXIF
  orientation. `metadata().autoOrient` (sharp ≥ 0.34, the workspace has 0.35)
  reports the oriented size.
- `NodeContentRepository.listMedia` orders by `(created_at ASC, id ASC)` with
  the version 1 cursor `{ id, kind: "media", timestamp, version }`.
  `markForDeletion` and `retryDeletion` run one guarded `UPDATE ... AND NOT
  EXISTS (reference)`. When no row changes, they cannot tell "referenced" from
  "wrong status" and throw `CONTENT_INVALID_STATE` either way.
- `content_media_references (snapshot_id, source_key, field_path, media_id)`
  holds rows only for each entry's current draft and current published
  snapshots: publication deletes the previous published snapshot and cascades
  its references. `source_key` is `$fields` or a block key. `content_blocks`
  stores each block's type per snapshot. An index exists on `media_id`.
- Step 17A added `ActorSummary`, `actorDisplayName`, `foldAscii`, the
  `user`-table `LEFT JOIN` for display names, and version 2 query-bound entry
  cursors. The in-memory `InMemoryContentStore` in `@lacecms/test-utils` is the
  reference adapter behind the server tests. It uses offset cursors with a
  query prefix and keeps seeded actor names.

## Goals / Non-Goals

**Goals:**

- One list read returns filtered, sorted media with uploader names and usage
  counts. Cursors cannot mix queries.
- One detail read returns an item with bounded, located usage.
- Usage, deletion refusal, and the deletion guard all read the same projection.
- New uploads record display dimensions.
- Node and in-memory adapters return identical semantics.

**Non-Goals:**

- UI work, per-type totals, status or uploader filters, new indexes,
  dimension backfill, and D1 adapter code. The SQL stays D1-compatible: only
  CTEs, `instr`, `lower`, `collate nocase`, and correlated subqueries are used.

## Decisions

### D1 — Catalog reads are a separate port from lifecycle reads

`@lacecms/application` adds:

```ts
MEDIA_SORTS = ["-createdAt", "-filename", "-size", "createdAt", "filename", "size"]
DEFAULT_MEDIA_SORT = "-createdAt"; MAX_MEDIA_SEARCH_LENGTH = 200; MAX_MEDIA_USAGE_ENTRIES = 50
interface MediaCatalogItem { createdBy: ActorSummary; media: MediaMetadata; usageCount: number }
type MediaUsageLocation =
  | { source: "field"; field: string; states: readonly MediaUsageState[] }
  | { source: "block"; blockKey: BlockKey; blockType: string; field: string; states: ... }
interface MediaUsageEntry { entryId; locations; modelKey; slug?; status: ContentEntryStatus; title }
interface MediaCatalogPort {
  loadMediaCatalogItem(id: string): Promise<MediaCatalogItem | null>;
  loadMediaUsage(input: { mediaId: MediaId; limit: number }): Promise<readonly MediaUsageEntry[]>;
}
```

`ListMediaInput` gains `q?`, `type?: MediaMimeType`, and a required
`sort: MediaSort`. `MediaListPort.listMedia` returns
`CursorPage<MediaCatalogItem>`. `MediaReadPort.loadMedia` stays unchanged,
because content validation, preview, and the deletion dispatcher need only the
lifecycle record and must not pay for joins.

`MediaView` replaces `createdBy: string` with `createdBy: ActorSummary` and
adds `usageCount`. `MediaDetailView` extends it with `usage`. `get` returns
`MediaDetailView | null`. `create`, `requestDeletion`, and `retryDeletion` call
`loadMediaCatalogItem` after their command. In `create`, that reload runs after
the metadata `try` block, so a reload failure never triggers object cleanup for
metadata that was committed.

`list` trims `q`, rejects a term longer than 200 characters, an unknown type,
or an unknown sort with `CONTENT_INVALID_STATE` before any read, and applies
the default sort.

*Rejected:* adding display names and counts to `MediaMetadata`. It is a
domain lifecycle type that also carries the private storage key, and the
dispatcher and content validation would then run joins they never use. Also
rejected: a separate `/usage` route. The details panel always needs both
halves, so one detail read avoids a second round trip.

### D2 — Node list query and version 2 media cursors

```sql
select m.*, u.name as created_by_name, <usage count> as usage_count, <sort value> as sort_value
  from media m left join user u on u.id = m.created_by
 where 1 = 1 [and instr(lower(m.filename), ?) > 0] [and m.mime_type = ?]
       [and (<order> <cmp> ? or (<order> = ? and m.id <cmp> ?))]
 order by <order> <dir>, m.id <dir> limit ?
```

`<usage count>` is `(select count(distinct s.entry_id) from
content_media_references r join content_snapshots s on s.id = r.snapshot_id
where r.media_id = m.id)`. It uses `content_media_references_media_idx`, so it
is bounded per row, and a page has at most 100 rows. The sort map is
`createdAt → m.created_at`, `filename → m.filename collate nocase` (value
`m.filename`), and `size → m.size`.

The cursor is `{ id, kind, value, version: 2 }`, where
`kind = JSON.stringify(["media", sort, type ?? null, q ?? null])`. Decoding
checks the exact key count, the version, the kind, a non-empty ID, and the
value type. The value must be a string of at most 255 characters for
`filename`, and a safe non-negative integer otherwise. Version 1 cursors fail
validation.

### D3 — Usage read: one CTE, grouped in memory

```sql
with used as (
  select distinct s.entry_id from content_media_references r
    join content_snapshots s on s.id = r.snapshot_id where r.media_id = ?),
page as (
  select e.id from content_entries e join used on used.entry_id = e.id
   order by e.updated_at desc, e.id desc limit ?)
select e.id, e.model_key, e.updated_at, d.title, d.slug, <entry status> as status,
       case when r.snapshot_id = e.draft_snapshot_id then 'draft' else 'published' end as state,
       r.source_key, r.field_path, b.block_type, b.position
  from content_media_references r
  join content_snapshots s on s.id = r.snapshot_id
  join content_entries e on e.id = s.entry_id and e.id in (select id from page)
  join content_snapshots d on d.id = e.draft_snapshot_id
  left join content_snapshots p on p.id = e.published_snapshot_id
  left join content_blocks b on b.snapshot_id = r.snapshot_id and b.block_key = r.source_key
 where r.media_id = ?
```

The adapter groups rows by entry, keeping the page order, and then by
`(source, blockKey, field)`, merging `states` in the order `draft`,
`published`. Field locations come first, ordered by field. Block locations
follow, ordered by the smallest block position and then by block key.
`blockType` comes from the referencing snapshot's block, and the draft's type
wins when both exist. `<entry status>` reuses 17A's revision comparison. A
reference whose block row is missing indicates corrupt storage. The adapter
fails with an internal error rather than inventing a type.

### D4 — `MEDIA_IN_USE` is a domain error, classified after a failed guard

`DomainErrorCode` gains `MEDIA_IN_USE`. `@lacecms/contracts` adds it to
`errorCodeSchema`, maps it to `409`, and gives it the message "The media is
still used by content." In Node, when the guarded update changes no row, the
same transaction reads `status` and
`exists(select 1 from content_media_references where media_id = ?)`. If the
item has the expected status (`active` for mark, `delete_failed` for retry) and
a reference, the adapter throws `MEDIA_IN_USE`. Otherwise it throws
`CONTENT_INVALID_STATE`. The classification read runs inside the write
transaction, so it sees the same state as the guard. The in-memory store
already checks status and references separately and switches only the
referenced branch's code.

*Rejected:* putting the usage list in the error `details`. Error envelopes
would carry entry titles, and the admin already has the detail route for
guidance.

### D5 — Display dimensions from `autoOrient`

`NodeSharpImageInspector` returns `metadata.autoOrient.width/height` and
rejects non-positive or missing values as invalid image data. The use case's
limits check the returned values. Rotation swaps the two sides, so neither the
maximum side nor the pixel product changes. The `ImageInspector` port comment
now says that it returns orientation-applied dimensions. Existing rows keep
their stored values.

### D6 — Contracts and transport

`@lacecms/contracts` adds `mediaMimeTypeSchema`, `mediaSortSchema`,
`MAX_MEDIA_SEARCH_LENGTH`, and `mediaListQuerySchema`. The query schema is a
non-strict `v.object`, like the entry-list query, with trimmed `q`, `type`,
`sort`, `limit`, and `after`. It also adds `mediaUsageLocationSchema` (a
variant on `source`, with `states` non-empty, at most 2, and unique),
`mediaUsageEntrySchema`, and
`mediaDetailSchema = { ...mediaMetadataSchema.entries, usage: max 50 }`.
`mediaMetadataSchema.createdBy` becomes `actorSummarySchema`. It gains
`usageCount`, and `width`/`height` become optional positive integers.
`toMediaMetadataDto` takes the new source shape, and `toMediaDetailDto` maps
usage.

`@lacecms/server` adds the query validator to `GET /api/v1/admin/media` and a
new `GET /api/v1/admin/media/:mediaId` route that returns `mediaDetailSchema`
or `404`. The route is registered alongside the existing `:mediaId` routes.
Cursor/query mismatches surface exactly like 17A's entry-list mismatches. The
OpenAPI document is regenerated.

### D7 — Admin client stays thin

`listMedia(cursor?, query?)` mirrors `listEntries`. It sends `q` only when the
trimmed value is non-empty, plus `type`, `sort`, and `limit`. `getMedia(id)`
parses `mediaDetailSchema`, and `adminQueryKeys.mediaDetail(id)` is added. The
deletion hook's message distinguishes `MEDIA_IN_USE` from other refusals.
Fixtures move to the new DTO. No screen changes; 18B owns the library UI.

## Risks / Trade-offs

- [The usage-count subquery runs per listed row] → The page size is at most
  100, and each subquery is an indexed lookup on `media_id` plus a
  primary-key join to snapshots.
- [Non-default sorts scan `media`] → Libraries are small in the MVP, and the
  17A precedent defers indexes until measurements justify them.
- [Rotated images uploaded before this change keep sensor dimensions] → This
  is documented. Re-uploading fixes an item, and dimensions remain advisory
  display metadata.
- [The admin API DTO shape changes] → Only the bundled admin consumes it, and
  it changes in the same commit. Public, SDK, and build contracts are
  untouched.
- [Filename ordering differs between SQLite `nocase` byte order and JS string
  order for some non-ASCII names] → The in-memory adapter reuses 17A's
  ASCII-folded comparison for titles. It matches SQLite for ASCII and BMP names,
  and the parity tests use such names.

## Migration Plan

No schema migration. Deploying the change invalidates version 1 media cursors,
which fail once as validation errors, and clients restart from page one. To
roll back, revert the commit. Stored data does not change.
