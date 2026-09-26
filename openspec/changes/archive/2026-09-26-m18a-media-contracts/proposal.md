## Why

Roadmap Step 18 (Media library), Session 18A, prepares the data that the
rebuilt library screen (18B) and media picker dialog (18C) need. Today the admin
media list returns every item oldest first with no search, type filter, or
sort. Each item names its uploader only by a raw user ID and says nothing about
where it is used. Deletion of referenced media fails with the generic
`CONTENT_INVALID_STATE`, so the admin can only guess why. Stored image
dimensions ignore EXIF orientation, so a rotated phone photo reports its sensor
size instead of the size it is displayed at. This change supplies those
contracts and leaves the library UI unchanged. It follows architecture §9.7
(media metadata, the `content_media_references` projection, and asynchronous
recoverable deletion), §12 (shared contracts, cursor pagination, explicit
DTOs, and one stable error envelope), and the Step 17 rule that admin surfaces
never need raw user IDs.

## What Changes

- Add `q` (case-insensitive ASCII filename substring, at most 200 characters),
  `type` (one of the four allowed image MIME types), and `sort` (`createdAt`,
  `filename`, or `size`, either direction; default `-createdAt`, newest first)
  to `GET /api/v1/admin/media`. Continuation cursors are bound to the query that
  produced them.
- Record display dimensions at upload. The server stores the width and height
  after applying EXIF orientation, so a portrait photo stored sideways reports
  portrait dimensions. Every media item created by upload has both values.
- **BREAKING (admin API only):** the media DTO's `createdBy` changes from a raw
  ID string to `{ id, displayName }`, and every media DTO gains `usageCount`,
  the number of distinct entries whose draft or published snapshot references
  the item.
- Add `GET /api/v1/admin/media/:mediaId`, which returns the media DTO plus
  `usage`. `usage` lists up to 50 referencing entries with each entry's title,
  slug, model, and status, and each location (entry field or block field) with
  whether the draft, the published version, or both use it. The data comes from
  the existing `content_media_references` projection, which is also what the
  deletion guard checks.
- Add the stable error code `MEDIA_IN_USE` (HTTP `409`). It is returned when a
  deletion request or retry is refused because content still references the
  item. Other ineligible deletions keep `CONTENT_INVALID_STATE` (`422`).
- Update the admin client to the new DTOs, the optional list query, and the
  detail read. Update the existing deletion message to explain `MEDIA_IN_USE`.
  Cover contracts, OpenAPI output, the Node and in-memory adapters, the use
  cases, the image inspector, the HTTP routes, and the negative cases.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `media-use-cases`: display-oriented dimensions at upload, validated list
  filters and sort, uploader display names, derived usage for list and detail
  reads, and a distinct in-use deletion refusal.
- `rest-contracts`: admin media-list query, uploader summary, `usageCount`,
  the media detail route with `usage`, and the `MEDIA_IN_USE` error mapping.
- `node-content-repositories`: SQLite media search, type filter, sorts,
  query-bound media cursors, usage counts and usage locations read from the
  reference projection, and in-use refusal classification.

## Impact

- Packages: `@lacecms/domain` (error code), `@lacecms/application` (media
  ports, catalog item, usage types, use cases), `@lacecms/contracts` (schemas,
  mappers, error mapping), `@lacecms/platform-node` (SQLite queries, sharp
  inspector), `@lacecms/test-utils` (in-memory reference store),
  `@lacecms/server` (routes, OpenAPI), `apps/api/openapi/api-v1.json`,
  `apps/admin` API client, deletion message, and fixtures, and architecture
  §9.7 and §12.
- No database migration. The queries use the existing `media` table and the
  `content_media_references_media_idx` index. Existing rows keep the dimensions
  already stored for them. This change does not backfill rotated images.
- Breaking for admin API consumers only. `createdBy` becomes an object, media
  DTOs gain the required `usageCount`, the default list order becomes newest
  first, and media cursors issued before this change are rejected once, so
  clients restart from the first page. Only the bundled admin consumes these,
  and this change updates it. Public media binary reads and the SDK are
  unchanged.
- Dependencies: accepted `media-use-cases`, `rest-contracts`,
  `node-content-repositories`, and `admin-media-library`. Step 17A provides the
  actor-summary and query-bound cursor patterns reused here. Sessions 18B and
  18C consume these contracts.
- Non-goals: any library, details-panel, or picker UI (18B/18C); per-type
  totals; filters by lifecycle status or uploader; new indexes for non-default
  sorts; backfilling dimensions of existing media; non-image media types;
  Cloudflare D1 adapters (not yet implemented; the SQL stays
  SQLite/D1-compatible).
