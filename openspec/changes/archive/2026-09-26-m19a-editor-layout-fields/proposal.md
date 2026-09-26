## Why

Roadmap Step 19 (Block editor), Session 19A, starts the editor redesign. The
entry editor still uses the pre-redesign layout: a plain "Edit posts" heading,
two separate save buttons, a dashed publication panel that prints the last
editor's raw user ID and an ISO timestamp, a narrow single-column form, and
field controls built from native `<select>`, checkbox, `date`, and free-text
datetime inputs. It also offers Save to viewers, whom the API will reject. Step
19's outcome is an editor that reads clearly at a glance, with publication state
in plain language. 19A delivers the layout, header, publication column, and
field controls. 19B (block cards) and 19C (rich-text toolbar and validation
summary) build on them.

This change follows architecture §17 (admin application, source layers, design
tokens, and the rule that the editor makes draft, published, and build status
visible), §9.8 (site builds are tracked by `site_builds`, but no admin read of
them exists before Step 21), and the accepted `admin-draft-editor` and
`admin-application-shell` specs.

## What Changes

- **Sticky header actions.** The shell header stays pinned while the route
  scrolls. It gains a page-actions slot, and the entry editor fills that slot
  next to the existing breadcrumbs. The slot holds a save-state indicator
  (`Unsaved changes`, `Saving…`, `Not saved`, `Saved revision N`, or
  `View only`), a single Save button that also responds to `⌘S`/`Ctrl+S`
  (with a visible shortcut hint and `aria-keyshortcuts`), and Publish for
  admins. The shortcut never opens the browser's save dialog while the editor
  is mounted. The duplicate bottom "Save draft" button is removed. The Save
  button keeps the accessible name "Save draft".
- **Title as a large input.** The title renders as a large, borderless-at-rest
  input under a small "Edit <model>" page heading. It keeps its accessible
  "Title" label.
- **Two-column editor.** At large widths, the main column holds the title and
  blocks, and the right-hand column holds publication details and the entry's
  fields. Below that width, the column stacks after the blocks.
- **Publication details in plain language.** The details show a status badge
  (Draft, Published, or Changed), the live revision with its relative
  publication time or "Not published", the draft revision, the last editor's
  display name with relative time (absolute time on hover), the public URL
  path, and the latest build state. Until Step 21 adds a build read, the latest
  build state is the dispatch outcome of the most recent publish from this
  editor, or a statement that no build was requested here, with a link to
  Builds. Raw user IDs and ISO timestamps are never shown.
- **Entry fields.** The right-hand column also holds the collection slug (with
  "Suggest from title") and every model field.
- **Field renderers on the new primitives.**
  - Select uses the Radix Select primitive, with a "No selection" choice for
    optional fields.
  - Date uses a Calendar-in-Popover picker with Clear.
  - Datetime uses the same picker plus a UTC time input, and composes a UTC ISO
    value.
  - URL uses an icon input with an "Open link" action for http(s) values.
  - Boolean uses a new Lace-owned `Switch` primitive.
  - Number uses a numeric input.
  - Controls gain `aria-invalid` when their field has an error.
- **Viewers see the editor read-only.** Viewers get no Save, no shortcut save,
  and no Publish. Native controls sit in a disabled fieldset, rich text is not
  editable, and media fields show their item without picker actions.
- **Cleared values stay cleared.** Clearing a loaded optional value used to
  snap back to the loaded value, because React Hook Form falls back to its
  default for `undefined`. Cleared values are now held as `null` and removed
  before saving. The API remains the authorization boundary.
- **Restyled dialogs, same semantics.** The publish confirmation adds Cancel
  and states which revision becomes live and where. The revision-conflict
  recovery becomes a styled inline alert above the title, with the same
  actions and behavior. The discard-unsaved-changes prompt becomes a modal
  `alertdialog` with the same Stay and Leave choices.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `admin-draft-editor`: publication visibility moves to plain-language details
  that include the last editor's display name, relative times, and the latest
  build state. A new requirement covers the editor layout, the sticky header
  actions, and the Save shortcut. The field-rendering requirement names the
  picker-based controls. The unsaved-draft requirement adds the modal discard
  prompt. A new requirement makes the editor read-only for viewers.
- `admin-media-library`: the picker-dialog requirement's viewer scenario now
  describes the dialog's role gating directly. A new scenario states that a
  viewer's media field in the read-only editor shows its item without Choose
  media, Replace, or Remove.
- `admin-application-shell`: the header requirement adds that the header stays
  visible while content scrolls and offers a page-actions slot beside the
  breadcrumbs.

## Impact

- `apps/admin`:
  - `pages/entry/EntryPage`: layout rebuilt and split into internal parts
    within the page slice.
  - `entities/content/FieldRenderer`: renderers rebuilt, and `invalid` and
    `readOnly` props added.
  - `entities/content/RichTextEditor`: `readOnly` prop added.
  - `features/publish-entry`: dialog restyled.
  - `widgets/admin-shell`: sticky header and `ShellHeaderActions` slot.
  - `shared/ui`: new `Switch`.
  - `shared/lib`: save-shortcut hook.
  - `widgets/media-library`: `MediaPicker` and `SelectedMedia` get read-only
    presentation.
  - Tests and e2e specs that used native select, checkbox, and date controls
    also change.
- No API, contract, OpenAPI, database, SDK, or dependency change. The editor
  consumes the existing `AdminContentEntryDto` (`updatedBy.displayName`) and
  the publish result's build outcome.
- Dependencies on accepted work: 16B primitives (Select, Popover, Calendar,
  Dialog, Badge), 17A `updatedBy` on the admin entry DTO, 17B shell and
  breadcrumbs, 17C `EntryStatusBadge`, 18C media picker.
- Non-goals:
  - Block cards, block icons and descriptions, the insert control, and the
    Add-block menu (19B).
  - The rich-text toolbar, the validation summary, and error linking (19C).
  - A persisted latest-build read and the Builds screen (Step 21).
  - An absolute site origin for the public URL, which has no configuration
    today.
  - Dark mode.
