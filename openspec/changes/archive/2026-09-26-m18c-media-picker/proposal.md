## Why

Roadmap Step 18 (Media library), Session 18C, finishes the media outcome:
editors must reuse images visually without leaving the editor. Today a model or
block media field opens an inline, text-only chooser (`MediaChoices`) with a
single-file upload, and shows its value as the raw media ID
(`Selected: media-1`). Editors cannot see which image a field holds, search the
library from the editor, or upload several files there. The raw ID also breaks
the Step 17 rule that admin surfaces never show internal identifiers. This
change follows architecture §9.7 (private media behind the admin preview
boundary), §12 (the admin media list query and detail read delivered by 18A),
and §17 (layered admin source, shadcn primitives, and the URL-state rules that
the picker deliberately does not use). It reuses the grid, toolbar, thumbnail,
and upload queue that 18B built for this purpose.

## What Changes

- Replace the inline chooser with a modal picker dialog, titled
  "Choose media for <field>". It reuses the library grid, filename search, type
  filter, sort, and "Load more" pagination. Its query is local dialog state, not
  URL state, and it resets each time the dialog opens. The dialog offers only
  active items, marks the current selection, and chooses an item and closes
  when a tile is activated. Choosing never saves the draft.
- Writers can upload inside the dialog. They can drop files over the dialog or
  use "Upload images" for several files, and they get the same per-file
  checks, progress, errors, and retry as the library. A confirmed upload
  appears in the dialog's grid and offers "Use" in its queue row, so it can be
  chosen even when a filter hides it. Uploading never selects an item
  implicitly. Viewers get no upload controls.
- Show a media field's value as a card with a lazily loaded thumbnail, the
  filename, type and dimensions, and "Replace" and "Remove" actions. The card
  resolves the value through the media detail read. It shows explicit loading,
  deletion-pending, deletion-failed, deleted (not found), and could-not-load
  (other failures, with retry) states. It keeps the stored identifier in the
  draft until the writer replaces or removes it, and it never displays the raw
  ID. An empty field shows "Choose media".
- Focus returns predictably: to the field's current action when the dialog
  closes, and to "Choose media" after Remove.
- Remove the inline `MediaChoices` chooser and the single-file `MediaUpload`
  feature component, which only it used.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `admin-draft-editor`: the media field requirement moves from the inline
  chooser to a picker dialog with library search and in-dialog multi-file
  upload, and to a selected-media card with Replace, Remove, and explicit
  unresolved states that never show the raw identifier.
- `admin-media-library`: adds a requirement that the picker dialog reuses the
  library's grid, search, type filter, sort, pagination, and upload behavior
  as local state, and is keyboard operable with focus return.

## Impact

- `apps/admin`: `widgets/media-library` (new `MediaPickerDialog` and
  `SelectedMedia`; `MediaPicker` rewritten; `MediaGrid` gains a choose mode;
  `MediaToolbar` makes the view toggle optional; `MediaChoices` removed),
  `features/upload-media` (`UploadQueue` gains an optional "Use" action;
  `MediaUpload` removed), and the tests that relied on the old chooser text
  (`FieldRenderer`, `BlockEditor`, `EntryPage`, `MediaPicker`, and the admin
  e2e specs).
- No API, contract, OpenAPI, database, SDK, or dependency change. The picker
  consumes the existing list query, detail read, preview endpoint, and upload
  transport.
- Dependencies on accepted work: 18A media contracts, 18B library components,
  the 16B shared Dialog primitive, and the draft editor's field renderer
  registry.
- Non-goals: selecting several media items for one field; editing alt text or
  filenames; cropping or transformations; a details panel inside the picker;
  showing a field's own usage; the Step 19 field-renderer restyle.
