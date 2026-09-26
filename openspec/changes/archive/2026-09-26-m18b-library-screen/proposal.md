## Why

Roadmap Step 18 (Media library), Session 18B, rebuilds `/media` on top of the
contracts delivered by 18A. Today the library is a vertical list of text rows:
there are no thumbnails, no search, filter, or sort, uploads take one file at a
time through a bare file input, and deletion uses `window.confirm` without
showing where the item is used. Editors cannot browse or inspect images
visually. This change follows architecture §9.7 (private media, admin preview
boundary, recoverable asynchronous deletion), §12 (the admin media list query
and detail read), §17 (layered admin source, shadcn primitives, tokens), and
§19 (the approved `react-dropzone` dependency, added by the change that first
imports it). It keeps the Step 17 rule that admin surfaces never show raw user
IDs.

## What Changes

- Rebuild `/media` as a tile grid with lazily loaded previews served by the
  authenticated admin preview endpoint, a visible fallback for failed previews,
  and status badges for items pending or failing deletion.
- Add filename search, a type filter (all, JPEG, PNG, WebP, AVIF), a sort
  control (newest, oldest, name, size), and a grid/list toggle. They live in
  the route's URL search parameters, so reloading restores them; unsupported
  values are ignored and defaults are not written. The list view is a table
  with thumbnail, filename, type, dimensions, size, uploader, upload date, and
  usage count.
- Add a drop zone over the whole library and a multi-file "Upload images"
  picker for writers. Each file gets its own row with byte progress, client-side
  type and 10 MiB size checks before anything is sent, per-file server errors,
  and retry for failed server uploads. Successful uploads appear in the library
  without a manual refresh.
- Add a details side panel opened from a tile or row. It shows a larger
  preview, type, dimensions, size, uploader name, upload date, status, usage
  (entries and locations from the 18A detail read, linking to each entry), a
  copy-URL action for the public media URL, and a confirmed deletion dialog.
  Deletion is disabled with guidance while content uses the item. A
  `delete_failed` item offers retry, and `deleting` is labelled as pending.
- The admin client reports upload progress through an optional callback. The
  default browser client uses `XMLHttpRequest` for uploads only. An injected
  fetcher keeps the fetch path.
- Add `react-dropzone` to the workspace catalog and the admin package.
- The field media picker keeps its current inline behavior on a picker-only
  chooser until 18C replaces it with a dialog.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `admin-media-library`: visual grid and list browsing with lazily loaded
  previews; search, type filter, sort, and view as URL state; drop-zone and
  multi-file upload with per-file progress and errors; a details panel with
  metadata, usage, copy URL, and a confirmed, usage-aware deletion.

## Impact

- `apps/admin`: `pages/media`, `widgets/media-library` (new library, grid,
  list, toolbar, details panel; picker-only chooser), `features/upload-media`
  (upload queue and drop zone), `features/delete-media` (confirmation dialog),
  `entities/media` (file validation, type labels, thumbnail), `shared/api`
  (upload progress transport, media list query keys), `shared/lib` (byte
  formatting), `app/router` (media search parsing), and the admin e2e specs.
- Dependencies: adds `react-dropzone` to `pnpm-workspace.yaml` and
  `apps/admin/package.json`, as approved in architecture §19.
- No API, contract, OpenAPI, database, or SDK change. The screen consumes the
  18A list query, detail read, and `MEDIA_IN_USE` error as they are.
- Dependencies on accepted work: 18A media contracts, the 16B shared UI
  primitives, and the 17B shell.
- Non-goals: the picker dialog and field thumbnails (18C); bulk selection and
  bulk delete; upload cancellation; per-type totals; editing filenames or alt
  text; image transformations; infinite scroll (pagination stays an explicit
  "Load more").
