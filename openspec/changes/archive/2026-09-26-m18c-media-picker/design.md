## Context

18A delivered the media list query (`q`, `type`, `sort`) and the single-item
detail read `GET /api/v1/admin/media/:mediaId`, which returns 404 `NOT_FOUND`
for an absent item. 18B rebuilt `/media` from reusable widget-internal parts:
`MediaGrid` (tiles that open details), `MediaToolbar` (search, type, sort,
view), `entities/media` `MediaThumbnail` and `MediaStatusBadge`, and the
`features/upload-media` queue (`useMediaUploads`, `useMediaDropzone`,
`UploadQueue`). It left the field picker on a widget-internal inline chooser,
`MediaChoices`, with the single-file `MediaUpload`.

Current field behavior:

- `EntryPage` registers `{ media: MediaPicker }` through
  `FieldRendererProvider`. Model fields and block fields both render
  `MediaPicker({ fieldKey, onChange, value })`, where `value` is a media ID.
- `MediaPicker` toggles `MediaChoices` inline and prints `Selected: <id>` or
  "No media selected". `MediaChoices` searches loaded pages to decide whether
  a value is unresolved.
- The shared `Dialog` primitive (Radix) traps focus, closes on Escape, and
  returns focus to its trigger by default.
- Tests that rely on the old text: `MediaPicker.test.tsx`,
  `BlockEditor.test.tsx`, `EntryPage.test.tsx`, `FieldRenderer.test.tsx`
  (which uses its own stub renderer), `MediaChoices.test.tsx`,
  `MediaUpload.test.tsx`, and `acceptance.e2e.ts` ("Choose media for Media",
  then a button named after the file).

## Goals / Non-Goals

**Goals:**

- One picker dialog built from the 18B parts, with no duplicated list logic.
- A field value that is visible as an image, resolved by ID, and honest about
  deleted and unreadable items.
- Predictable keyboard focus through open, choose, dismiss, replace, and
  remove.

**Non-Goals:**

- Multi-select, alt text, cropping, a details panel in the picker, and the
  Step 19 field restyle.
- Any API or contract change.

## Decisions

### D1 — Widget composition

`widgets/media-library` holds everything, because the picker composes the
`upload-media` feature with media entities and the admin client:

- `MediaPicker` (the field renderer, public): it owns `open`, the focus refs,
  and the last chosen item. It renders `SelectedMedia` when `value` is a
  string. Otherwise it renders a "Choose media" button with the accessible
  name "Choose media for <label>" and a "No media selected" line. It renders
  `MediaPickerDialog` in both cases.
- `MediaPickerDialog` (internal): a controlled `Dialog`.
- `SelectedMedia` (internal): the value card.
- `MediaChoices` and its test are deleted. `features/upload-media/MediaUpload`
  and its test are deleted and removed from the slice's `index.ts`. Nothing
  else imports them.

*Rejected:* placing `SelectedMedia` in `entities/media`. It needs Replace and
Remove callbacks plus the detail query and its error mapping. That is
presentation around a widget flow, and the only consumer is the picker.

### D2 — Picker dialog content

`MediaPickerDialog({ open, onOpenChange, label, selectedId, onChoose, onCloseAutoFocus })`:

- The `DialogContent` is widened (`sm:max-w-4xl`) and height-bounded
  (`max-h-[85vh]`, a flex column). The title is "Choose media for <label>".
  A visually hidden description reads "Activate an image to use it."
- The inner body is mounted only while open, so the local query
  (`useState<CanonicalMediaQuery>({})`) and the upload queue reset on each
  open.
- The list uses `useInfiniteQuery` with `adminQueryKeys.mediaList(listQuery)`
  and `keepPreviousData`, the same key and function as the library. It shares
  that cache, and upload invalidation refreshes it. The widget filters items to
  `status === "active"`.
- `MediaToolbar` without the view toggle. Its `view` and `onViewChange` props
  become optional, and the toggle renders only when `onViewChange` is given.
- `MediaGrid` in choose mode. A new optional `currentId` prop and a
  `mode: "open" | "choose"` prop (default `"open"`) control it. In choose mode
  tiles omit `aria-haspopup`, and the current tile gets `aria-current="true"`
  plus a check badge with `ring-2 ring-primary`. The accessible name stays the
  filename. The grid is labelled "Media choices for <label>".
- States: `LoadingState`, then `ErrorState` with "Try again", then "No media
  yet" (writers are told to upload) or "No matching media" with Clear filters,
  then "Load more media". A polite "Showing N items" line follows.
- Writers (`session.role !== "viewer"`): `useMediaUploads` and
  `useMediaDropzone` over the scrollable body, with `DropOverlay` while
  dragging, a hidden input labelled "Upload images" and a button that opens
  it, the constraints text, and `UploadQueue` with `onChoose`.
- Activating a tile calls `onChoose(item)`. The caller closes the dialog.

### D3 — Upload rows can be chosen

`UploadQueue` gains an optional `onChoose?: (item) => void`. When it is given,
an `uploaded` row with an item renders a "Use" button (accessible name
"Use <filename>") before Dismiss. Using an upload from its row works when
filters hide it. The picker never auto-selects an upload. The library does not
pass `onChoose`, so its queue is unchanged.

### D4 — Resolving and presenting the value

`SelectedMedia({ mediaId, placeholder, label, onReplace, onRemove, replaceRef })`
reads `useQuery({ queryKey: adminQueryKeys.mediaDetail(id), queryFn: getMedia, retry: false })`.
It runs `useSessionRecovery` on the error. `placeholder` is the item just chosen
in this picker (when its ID matches). It is passed as `placeholderData`, so a
fresh choice renders at once without a loading flash. The detail read shares
its cache with the library's details panel, and upload and deletion
invalidation of the `["admin", "media"]` prefix keeps it current.

The card is a bordered row: a 4rem square `MediaThumbnail` (or an `ImageOff`
placeholder when unresolved), then text, then actions.

| Read result | Text | Extras |
|---|---|---|
| pending, no placeholder | "Loading selected media…" (`role="status"`) | skeleton thumbnail |
| active | filename, then "PNG · 800 × 600 px" (type label and dimensions when known) | — |
| `deleting` / `delete_failed` | filename + `MediaStatusBadge`, then "This media is being deleted and cannot be published." / "This media is marked for deletion and cannot be published." | — |
| `AdminClientError` with code `NOT_FOUND` | "Selected media no longer exists." | — |
| other error | "Selected media could not be loaded." + `errorDescription` | "Try again" (refetch) |

The status and unresolved texts sit in a `role="status"` line, so changes are
announced. Actions are always present: "Replace" (accessible name
"Replace media for <label>") and "Remove" ("Remove media from <label>"). Both
contain their visible text. The raw ID is never rendered.

*Rejected:* resolving from list pages as before. The spec forbids inferring
absence from loaded pages, and a single-item read is exact and cheap.

### D5 — Focus management

- Radix returns focus to a `DialogTrigger` by default. Here the trigger can
  unmount: choosing from the empty state replaces "Choose media" with the card.
  So `MediaPicker` renders plain buttons, not `DialogTrigger`s. It passes
  `onCloseAutoFocus={(event) => { event.preventDefault(); actionRef.current?.focus(); }}`.
  `actionRef` is attached to whichever control is rendered: Replace when there
  is a value, otherwise Choose media. Radix fires the handler from an effect
  cleanup after the commit that applied the new value, so the ref already
  points at the surviving control.
- Remove: `onChange(undefined)` unmounts the card. A `focusAfterRemove` ref
  flag is set, and a `useEffect` on `value` focuses `actionRef` (now Choose
  media) and clears the flag.

### D6 — Test updates

- `MediaPicker.test.tsx` is rewritten to cover dialog open, local search and
  type filtering with no URL change, a later page, choose closes with focus on
  Replace, Escape keeps the value, the not-found, deleting, and error-with-retry
  card states with no raw ID, Remove focusing Choose media, viewer without
  upload, a deleting item not offered, and mixed multi-file upload with "Use".
- `BlockEditor.test.tsx` and `EntryPage.test.tsx` choose inside
  `getByRole("dialog")` and assert the filename card instead of
  `Selected: media-1`. `FieldRenderer.test.tsx` uses its own stub renderer and
  stays unchanged.
- `MediaGrid.test.tsx` adds choose mode. `MediaToolbar.test.tsx` adds the
  hidden view toggle. `UploadQueue.test.tsx` adds the Use action.
- e2e: `editor.e2e.ts` gains a picker flow (a model with a block media field,
  a multi-file upload in the dialog with one server failure, Use, save, and
  keyboard dismissal). `acceptance.e2e.ts` scopes its file button to the
  dialog.

## Risks / Trade-offs

- [The detail read returns usage the card does not need] → The read is bounded
  (at most 50 entries) and is shared with the details panel cache. A metadata-only
  endpoint would be an API change outside this session.
- [A dialog and a nested native file chooser] → `open()` clicks a hidden input
  inside the dialog content. Focus returns to the dialog after the chooser
  closes, and Radix's focus trap does not block the native chooser.
- [Filtering out non-active items can leave a page with fewer tiles than the
  page size] → This is acceptable. "Load more" still pages with the server
  cursor.
- [Removing `MediaUpload` from the feature's public API] → Its only consumer
  is `MediaChoices`, which this change deletes.

## Migration Plan

This is a frontend-only change. Stored values stay media IDs, and no draft
data changes. To roll back, revert the commit.
