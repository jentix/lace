## Context

18A delivered `GET /api/v1/admin/media` with `q`, `type`, and `sort`, media DTOs
with `createdBy { id, displayName }`, `usageCount`, and oriented dimensions,
`GET /api/v1/admin/media/:mediaId` with bounded `usage`, and `MEDIA_IN_USE`.
The admin client already exposes `listMedia(cursor, query)` and `getMedia(id)`.

The current admin pieces:

- `widgets/media-library/MediaLibrary` is one component that serves both the
  `/media` screen and the field picker (`onSelect`). It renders text rows,
  toggles one inline `MediaPreview`, uses `window.confirm` for deletion, and
  keys its infinite query on `adminQueryKeys.media(cursor)`.
- `features/upload-media/MediaUpload` uploads one file through a bare input.
  `features/delete-media/useMediaDeletion` wraps delete and retry.
- `entities/media` holds `maxMediaBytes`, `mediaTypes`, and `MediaPreview`,
  which retries a failed preview.
- The client uploads with `fetch`, which cannot report upload progress.
- 17C established the URL-state pattern: `validateSearch` with a parser in
  `app/router`, a canonical query without defaults, `navigate({ replace: true })`,
  a 300 ms debounced search box, `keepPreviousData`, and "Load more"
  pagination.
- `scripts/check-boundaries.mjs` enforces `app → pages → widgets → features →
  entities → shared`. Slices in the same layer cannot import each other, and
  each slice exposes only its `index.ts`.

## Goals / Non-Goals

**Goals:**

- A visual, URL-addressable library that reuses the 17C list conventions.
- Multi-file upload whose per-file state stays independent and accurate.
- One details panel that serves as the single place to inspect, copy, and delete.
- Components that 18C can reuse: the grid, the toolbar, the thumbnail, and the upload queue.

**Non-Goals:**

- Changing the field picker's behavior. That is 18C.
- Upload cancellation, bulk actions, and virtualized or infinite scrolling.

## Decisions

### D1 — Split the screen library from the picker chooser

`widgets/media-library` gets a new `MediaLibrary({ query, onQueryChange })` for
`/media`. The previous selection-mode code moves unchanged in behavior into a
widget-internal `MediaChoices` that `MediaPicker` uses. It keeps the inline
single-file `MediaUpload` so the editor flow and its e2e stay intact until 18C.
The screen library is composed of widget-internal components: `MediaToolbar`
(search, type, sort, view), `MediaGrid`, `MediaListTable`, and
`MediaDetailsPanel`.

*Rejected:* one component with more modes. The screen and the picker diverge
further in 18C, where the picker becomes a dialog around the grid. Mode flags
would leak deletion and upload rules into the chooser.

### D2 — URL state mirrors 17C

`app/router/media-search.ts` exports
`parseMediaSearch(search) → { q, sort, type, view }`. It uses
`mediaMimeTypeSchema`, `mediaSortSchema`, `MAX_MEDIA_SEARCH_LENGTH`, and a
`view` picklist of `grid` or `list`. It drops invalid values and the defaults
`-createdAt` and `grid`. `MediaPage` reads the search through
`getRouteApi("/_protected/media")` and writes it with
`navigate({ replace: true, search })`. The widget normalizes the query again
before keying the infinite query, so equivalent URLs share a cache entry.

Query keys: `adminQueryKeys.media` becomes the constant prefix
`["admin", "media"]`, which mutations use for invalidation. It also covers
details. A new `mediaList({ q, sort, type })` keys lists. The previous
`media(cursor)` function is removed, and its callers (the picker chooser, the
upload feature, and deletion) move to the prefix and `mediaList({})`.

### D3 — Lazy thumbnails are plain `<img loading="lazy">`

`entities/media/MediaThumbnail` renders
`<img loading="lazy" decoding="async">` from the admin preview endpoint. On
error it swaps to an `ImageOff` icon with the filename kept as text. The
details panel keeps `MediaPreview`, which has retry, and gains a
`className` prop.

*Rejected:* an `IntersectionObserver` hook. Native lazy loading is supported by
every browser the admin targets. It needs no code, and jsdom ignores it, which
keeps tests deterministic. Tests assert the attribute.

### D4 — Upload progress via an XHR transport inside the admin client

`AdminClient.uploadMedia(file, options?: { onProgress?: (fraction: number) => void })`.
`createAdminClient(fetcher?, uploader?)` picks the uploader in this order: an
explicit `uploader` argument; otherwise, when no `fetcher` was injected and
`XMLHttpRequest` exists, an XHR uploader that reports `upload.onprogress` as
`loaded / total` and sends `withCredentials` same-origin; otherwise a fetch
uploader over the given fetcher with no intermediate progress. Both uploaders
return `{ status, requestId, body }`. The existing error mapping
(`responseError`) is refactored to take those three values, so both paths
produce identical `AdminClientError`s and parse the response with
`mediaMetadataSchema`.

*Rejected:* dropping byte progress in favor of an indeterminate state. The
roadmap asks for per-file progress, and 10 MiB images over slow links benefit
from it. Also rejected: a separate upload module outside the client. The
client is the one place that validates API exchanges.

### D5 — Upload queue and drop zone in `features/upload-media`

- `validateMediaFile(file)` in `entities/media` returns `"type"`, `"size"`, or
  `undefined`. The MIME type decides the type check. An empty MIME type falls
  back to the extension (`.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`), and the
  server still verifies the bytes.
- `useMediaUploads()` keeps an ordered list of
  `{ key, file, state: "queued" | "uploading" | "uploaded" | "rejected" | "failed", progress?, message?, item? }`.
  It runs at most two uploads concurrently. Each success invalidates the media
  prefix. It exposes `add(files)`, `retry(key)` (failed only), `dismiss(key)`,
  and `clearFinished()`. A `rejected` entry never makes a request. A session
  expiry reported by any upload goes through `useSessionRecovery`.
- `useMediaDropzone({ disabled, onFiles })` wraps `react-dropzone` with
  `noClick`, `noKeyboard`, and `multiple`. It does not use dropzone `accept`
  or `maxSize` validation, because our validator produces the messages. It
  passes the MIME list as the input's `accept` attribute for the native
  picker. The widget spreads `getRootProps` on the library section, renders
  `DropOverlay` while `isDragActive`, and wires an "Upload images" button to
  `open()`. The hidden input is labelled "Upload images".
- `UploadQueue` renders the entries as a list. Each row has the filename, the
  size, a `role="progressbar"` with `aria-valuenow` while uploading, a status
  or error text, Retry for failed rows, and Dismiss for finished rows. A polite
  live summary sits above the list, for example "1 of 3 uploaded, 1 failed".

### D6 — Details panel as a right-side Sheet

`MediaLibrary` holds `selectedId` and the element that opened it. The Sheet is
controlled. Its `onCloseAutoFocus` prevents Radix's default and focuses the
remembered opener, because opening happens without a `SheetTrigger`. The panel
reads the item from the loaded list, including overlays from mutation results,
and reads usage with `useQuery(mediaDetail(id))` while open. It renders:

- `MediaPreview`, then a `<dl>` of Type, Dimensions (`W × H px` or "Unknown"),
  Size (`formatBytes`), Uploaded by (display name), Uploaded (absolute date),
  and Status.
- Usage: loading skeleton, `ErrorState`, "Not used by any entry", or a list of
  entry links (`/content/$modelKey/$entryId`) with `EntryStatusBadge`, the
  model key, and location lines ("Image field · Draft and published"; "Hero
  block (hero) · Image field · Draft"). A truncation note appears when
  `usageCount > usage.length`.
- Copy URL: `navigator.clipboard.writeText(item.url)`. The result goes to a
  polite status line inside the panel ("URL copied" or "Copy failed"), which is
  testable without mounting the global Toaster. It includes a note that the
  public URL serves the file only once published content uses it.
- Actions for writers: `DeleteMediaDialog` (`features/delete-media`) for
  active items with `usageCount === 0`, a disabled delete button with guidance
  when the item is used, a Retry deletion button for `delete_failed`, and
  nothing for `deleting` beyond the pending label.

`DeleteMediaDialog` wraps the shared Dialog around `useMediaDeletion`. Its
trigger returns focus when the dialog is cancelled. On success it closes, and
the caller receives the updated item through `onChanged`. Errors use
`mediaDeletionDescription`.

### D7 — Grid and list presentation

- Grid: `ul` with `repeat(auto-fill, minmax(9rem, 1fr))`. Each tile is a
  `<button aria-haspopup="dialog">` containing a square thumbnail
  (`object-cover` over `bg-muted`), the filename (truncated, with a `title`
  attribute), and a status badge when not active. Its accessible name is the
  filename.
- List: the shared `Table` with columns thumbnail, filename (a button that
  opens details), type, dimensions, size, uploaded by, uploaded, and used in
  (count). Sorting lives in the toolbar Select, so the table has no sortable
  headers.
- Toolbar: search (300 ms debounce, `role="search"`), a type button group with
  `aria-pressed`, a sort `Select` (Newest first, Oldest first, Name A–Z, Name
  Z–A, Largest first, Smallest first), a grid/list toggle group with
  `aria-pressed` and icon plus visually hidden text, and Clear filters when a
  search or type is set.
- Formatting helpers: `formatBytes` in `shared/lib` (1024 base, B/KB/MB, one
  decimal) and `mediaTypeLabel` in `entities/media`.

### D8 — Dependency

Add `react-dropzone` (latest stable, pinned exactly) to the `pnpm-workspace.yaml`
catalog and `apps/admin/package.json`. Architecture §19 already approves it.

## Risks / Trade-offs

- [XHR bypasses an injected fetch wrapper] → Only the default browser client
  uses XHR. Tests and any injected fetcher keep the fetch path. XHR uses the
  same same-origin credentials and accept header, and error parsing is shared.
- [The drop zone covers the whole section, so dropping onto the details Sheet
  does nothing] → The Sheet is portalled outside the section. That is
  acceptable, because the overlay shows exactly where dropping works.
- [Newly uploaded items can be hidden by an active filter] → The upload queue
  row still reports success. This is expected filter behavior.
- [The picker chooser temporarily duplicates list logic] → 18C deletes it.

## Migration Plan

This is a frontend-only change with no data or API migration. Old `/media`
URLs without search parameters open the default grid. To roll back, revert the
commit.
