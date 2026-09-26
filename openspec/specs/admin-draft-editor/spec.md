# admin-draft-editor Specification

## Purpose

Defines the first browser-admin draft editor so writers can safely edit model
fields from server-supplied metadata and save one complete optimistic draft.

## Requirements

### Requirement: Draft fields are rendered from validated model metadata
The authenticated entry route SHALL load the requested entry and its matching
configured model before presenting editable content. It SHALL render title, the
collection-only slug, and every supported model-field descriptor from the
validated serializable metadata supplied by the model API. The field surface
SHALL cover text, textarea, rich text, number, boolean, date, datetime, select,
URL, and media descriptor types; it SHALL not execute callbacks or accept
unvalidated descriptor data from a response. Select fields SHALL choose from
the descriptor's options through a labelled listbox control, and an optional
select SHALL offer a choice that clears its value. Date fields SHALL be chosen
from a keyboard-operable calendar and SHALL display the chosen calendar date in
words. Datetime fields SHALL combine that calendar with a time input and SHALL
state that the time is in UTC; they SHALL store a UTC ISO timestamp. Optional
date and datetime values SHALL be clearable. Boolean fields SHALL be a labelled
switch that exposes its on or off state. URL fields SHALL offer to open an
entered `http` or `https` URL in a new browsing context. Editable values SHALL
be locally validated against the same client-safe descriptor constraints before
save, and each field error SHALL be programmatically associated with its
control, which SHALL also be marked invalid.

#### Scenario: A configured form is loaded
- **WHEN** an authenticated writer opens an entry whose model has text, number,
  boolean, select, date, datetime, URL, media, textarea, or rich-text fields
- **THEN** the draft values appear in controls generated from their descriptor
  metadata with accessible labels, descriptions where configured, and the
  descriptor-appropriate constraints

#### Scenario: A writer picks a select option and a date
- **WHEN** a writer opens a select field, chooses the "release" option, then opens a date field's calendar and chooses 25 September 2026
- **THEN** the select shows "release", the date control reads "Sep 25, 2026", and the next complete-draft save carries `release` and `2026-09-25`

#### Scenario: A writer sets a datetime
- **WHEN** a writer chooses 25 September 2026 and enters 14:30 in a datetime field
- **THEN** the next complete-draft save carries `2026-09-25T14:30:00.000Z` and the control states that the time is UTC

#### Scenario: A writer toggles a boolean
- **WHEN** a writer activates a boolean field's switch with the keyboard
- **THEN** the switch reports that it is on and the next complete-draft save carries `true`

#### Scenario: Client validation prevents an invalid save
- **WHEN** a writer submits a draft with a missing required value, an invalid
  select choice, a string or numeric value outside declared bounds, or another
  locally detectable descriptor violation
- **THEN** the affected control exposes an accessible error and the browser does
  not issue a draft-save request

#### Scenario: Model metadata is malformed or does not match the entry
- **WHEN** the entry route receives invalid model metadata, the model key does
  not exist, or the entry belongs to another model
- **THEN** it presents a safe error or not-found state and does not expose an
  editable form using unvalidated metadata

### Requirement: System fields have predictable collection-slug behavior
Every entry editor SHALL present title as an explicit required system field. A
collection editor SHALL additionally present slug as an explicit system field;
a page editor SHALL not render a slug control. A collection writer MAY opt into
slug suggestions derived from title. While suggestion is enabled and the slug
has not been manually changed, title edits SHALL update the suggested slug; a
manual slug edit SHALL stop automatic updates until the writer explicitly
re-enables suggestions.

#### Scenario: An opted-in suggestion follows a title
- **WHEN** a writer enables slug suggestions for an unedited collection slug
  and changes the title
- **THEN** the slug control receives the deterministic slug suggestion and the
  writer can save the suggested value as part of the complete draft

#### Scenario: A manual slug is preserved
- **WHEN** a writer manually changes a collection slug after enabling
  suggestions and subsequently changes the title
- **THEN** the manually entered slug remains unchanged and automatic suggestion
  stays disabled until the writer explicitly opts in again

#### Scenario: A page entry is edited
- **WHEN** a writer opens a page entry
- **THEN** the editor renders title and model fields but no slug control or slug
  suggestion affordance

### Requirement: Unsaved drafts are explicit and protected
The entry editor SHALL start clean from the loaded server draft, show a
distinct dirty state after an editable value differs from that draft, and SHALL
not implicitly save on typing, navigation, route reload, or unmount. Before an
in-application navigation or browser unload that would discard a dirty draft,
it SHALL require the writer to explicitly choose whether to leave. The
in-application choice SHALL be a modal alert dialog that traps focus, and
dismissing it SHALL count as choosing to stay. Choosing to stay SHALL retain the
current local values. Loading, local-validation, saving, saved, and
save-failure states SHALL be distinguishable without relying only on color.

#### Scenario: A dirty writer navigates away
- **WHEN** a writer changes a field and then attempts to navigate away from the
  entry route
- **THEN** the application asks for explicit confirmation in a modal alert
  dialog before discarding the draft and retains the local values when the
  writer chooses to remain or dismisses the dialog

#### Scenario: A writer leaves a pristine editor
- **WHEN** a writer has not changed the loaded draft and navigates away
- **THEN** navigation proceeds without a discard confirmation and no save
  request is sent

### Requirement: A save replaces the complete local draft only after success
An explicit Save action SHALL submit title, any applicable slug, all current
model-field values, and the preserved ordered block list through one
complete-draft request carrying the loaded draft revision as its optimistic
precondition. The editor SHALL replace its local baseline and editable state
only with the validated entry representation returned after a successful save;
it SHALL then show the returned revision and clean state. A failed save SHALL
retain the writer's values and dirty state, present a non-sensitive failure
state, and associate server validation issues with their matching controls when
the response provides field paths.

#### Scenario: A complete draft saves successfully
- **WHEN** a writer explicitly saves valid changed title, slug, or model-field
  values with the current revision
- **THEN** exactly one complete-draft request is sent and the displayed draft
  is replaced with the validated server response and its advanced revision

#### Scenario: Server field validation rejects a submitted value
- **WHEN** the server rejects a complete-draft request with documented
  field-level validation issues
- **THEN** the editor preserves the submitted values and exposes the applicable
  field errors accessibly without treating the draft as saved

#### Scenario: Save is never automatic
- **WHEN** a writer edits one or more fields but does not invoke Save
- **THEN** the client sends no draft-save request and the server draft revision
  remains unchanged

### Requirement: Draft blocks are authored as an ordered allowed aggregate
The authenticated entry editor SHALL expose only the configured model's allowed
registered block definitions whose portable metadata validates at the browser
boundary. A writer SHALL be able to add, duplicate, remove, collapse, and
reorder blocks without mutating another block's data. The browser SHALL assign
a ULID-format stable key to every newly added or duplicated block, retain it
through local reorders and saves, and ensure a duplicate receives a distinct
key. Keyboard and pointer reorder interactions SHALL update one shared visible
order. The editor SHALL retain sparse local positions while editing, submit its
blocks as an ordered complete-draft list, and replace its local list only with
the server-returned canonical positions after a successful save.

#### Scenario: A writer adds and duplicates an allowed block
- **WHEN** a writer selects an allowed block type and then duplicates that block
- **THEN** the editor renders two independently editable blocks of that type
  with distinct ULID-format keys and does not offer a block type outside the
  model's allowed definitions

#### Scenario: A writer reorders and collapses blocks
- **WHEN** a writer uses a keyboard or pointer reorder control and collapses a
  block while editing an entry with several blocks
- **THEN** the visible order and next complete-draft save reflect the reordered
  sequence while collapse changes only presentation and not the block data

#### Scenario: A save returns canonical block positions
- **WHEN** a writer saves an ordered locally edited block list and the server
  accepts the complete draft
- **THEN** the editor becomes clean only after replacing its block list with the
  returned snapshot, including the server's canonical positions

### Requirement: Rich text is edited only through the shared safe document subset
The editor SHALL provide rich-text controls for model rich-text fields and
rich-text block fields that create and edit the shared structured document
format. It SHALL enable only the shared allowed nodes, marks, heading levels,
and link URL forms, and SHALL not enable raw HTML input, HTML nodes, arbitrary
attributes, inline event handlers, styles, or unsafe link schemes. Invalid
rich-text values SHALL expose an accessible local field error and SHALL not
cause a complete-draft request.

#### Scenario: A writer formats safe rich text
- **WHEN** a writer applies an allowed mark, heading, list, quote, hard break,
  or allowed link to rich text
- **THEN** the editor stores the corresponding structured document in the draft
  field without serializing raw HTML

#### Scenario: Unsafe rich text is prevented locally
- **WHEN** a rich-text value contains an unsupported structure or an unsafe link
  URL before Save
- **THEN** the affected control exposes an accessible validation error and the
  browser sends no draft-save request

### Requirement: Generic block media fields use the existing media surface
Generic block fields SHALL render from their validated portable metadata. A model or block media field SHALL choose its stored media identifier through the shared media picker dialog, which browses active items across opaque cursor pages with the library's thumbnails, filename search, type filter, and sort, and SHALL let permitted writers upload within that dialog and choose a confirmed upload. The picker SHALL expose labelled loading, empty, no-match, upload-progress, validation-failure, and list-failure states without silently changing the draft; choosing an item SHALL change only that field's value and SHALL NOT save the draft. A field with a value SHALL show the selected item as a thumbnail read through the admin preview boundary together with its filename and offer Replace, which reopens the picker, and Remove, which clears the value. The field SHALL resolve its value through an authorized single-item media read rather than by searching loaded list pages, SHALL label the resolving state, and SHALL NOT infer that an item is missing merely because it is outside a loaded page. When the value is pending deletion, has failed deletion, no longer exists, or cannot be read, the field SHALL show a distinct accessible state for that condition, SHALL retain the identifier in the draft until the writer replaces or removes it, and SHALL offer retry when the read failed for another reason than absence. No media field state SHALL display the raw media identifier. The editor SHALL associate server validation issues at model-field, block-data, rich-text, or URL paths with the matching visible control while preserving the writer's complete local draft.

#### Scenario: A writer selects media for a block
- **WHEN** the media list loads and a writer opens the picker for a block media field and activates an active item's tile
- **THEN** the dialog closes, the block field shows that item's thumbnail and filename, and the next complete-draft save includes that media identifier

#### Scenario: A writer reuses media from a later page
- **WHEN** the desired active media item is beyond the first list page of the picker
- **THEN** the writer can request subsequent pages and choose it without leaving the editor or changing other draft values

#### Scenario: A writer searches the picker
- **WHEN** a writer types "hero" into the picker's search and selects the PNG filter
- **THEN** the picker requests media with that search and type, shows only the matching active items, and the editor route's URL does not change

#### Scenario: A writer uploads from the picker
- **WHEN** a permitted writer uploads a valid image from a field or block picker
- **THEN** the confirmed active item becomes choosable in that picker and its identifier enters the draft only when the writer chooses it

#### Scenario: Several files are uploaded from the picker with mixed results
- **WHEN** a writer uploads a valid PNG and a file the server rejects from a block picker
- **THEN** the PNG is reported as uploaded and can be chosen, the rejected file is reported with the server's error and a retry action, and the draft is unchanged until a choice is made

#### Scenario: A writer replaces and removes a selection
- **WHEN** a writer activates Replace on a selected field, chooses another item, and later activates Remove
- **THEN** the field first shows the newly chosen item and then shows that no media is selected, and neither action saves the draft

#### Scenario: A current selection no longer exists
- **WHEN** a saved media identifier's single-item read reports that the item was not found
- **THEN** the editor retains the identifier, states that the selected media no longer exists without showing the identifier, and allows explicit replacement or removal without silently mutating the draft

#### Scenario: A current selection is pending deletion
- **WHEN** a saved media identifier resolves to an item whose status is `deleting` or `delete_failed`
- **THEN** the field shows the item's filename with an accessible unavailable state for that status and offers Replace and Remove

#### Scenario: A current selection is inaccessible
- **WHEN** a saved media identifier's single-item read fails for a reason other than absence
- **THEN** the editor retains the identifier, presents an accessible could-not-load message with a retry action, and allows explicit replacement or removal

#### Scenario: Block validation fails on save
- **WHEN** the server rejects a block data field, rich-text value, or URL with a documented JSON Pointer issue
- **THEN** the editor preserves the local ordered block list and attaches an accessible error to the corresponding model or block field

### Requirement: The editor makes publication and draft concurrency explicit
The authenticated entry editor SHALL display, in plain language, the entry's
derived status (draft, published, or published with later changes), the live
revision and when it was published or that the entry is not published, the
current draft revision, the display name of the draft's last editor, and the
draft's update time. It SHALL also display the resolved canonical public path
when the model and draft make one available, and the latest build state known
to the editor. Times SHALL be shown relative to now with the absolute local time
available on demand. Publication details SHALL NOT display raw user or entry
identifiers or ISO timestamps. Until the admin can read persisted builds, the
latest build state SHALL be the dispatch result of the most recent publish
attempt made in the editor, or a statement that no build was requested from the
editor, with a link to the Builds screen. The editor SHALL display the distinct
result of the most recent publish attempt, including that publication succeeded
while its build is pending, unavailable, rejected, or not dispatched; it SHALL
not represent that build-dispatch result as confirmed public-site availability.
Only an `admin` role SHALL be offered publication. Before an admin publishes,
the editor SHALL require explicit confirmation that names the draft revision
that will become live and can be cancelled. It SHALL then submit the current
draft revision with a non-empty idempotency key. The browser SHALL retain that
key while retrying the same pending/failed network publish attempt and SHALL
replace it only after the attempt reaches a terminal server response or the
user starts a new confirmed publish attempt.

#### Scenario: An admin reviews publication state
- **WHEN** an admin opens a loaded entry with a collection slug and a current
  published snapshot
- **THEN** the editor shows its derived status, the live and draft revisions,
  the last editor's display name with a relative time, the resolved canonical
  public path, and a build state that does not claim a pending build has
  succeeded, without showing a user ID or an ISO timestamp

#### Scenario: No build was requested from the editor
- **WHEN** a user opens an entry and has not published it from this editor
- **THEN** the build state says that no build was requested from the editor and
  links to the Builds screen

#### Scenario: An editor cannot publish
- **WHEN** an `editor` opens a loaded entry
- **THEN** the editor does not offer a publish action, while the API remains the
  authorization boundary if a publication request is attempted independently

#### Scenario: An admin cancels publication
- **WHEN** an admin opens the publish confirmation and chooses Cancel
- **THEN** the dialog closes and no publication request is sent

#### Scenario: A confirmed publish is retried after a network failure
- **WHEN** an admin confirms publication and the browser cannot determine
  whether the request reached the server
- **THEN** a retry sends the same draft revision and idempotency key, and the UI
  uses the server's eventual one-publication result rather than creating a new
  attempt

### Requirement: Revision-conflict recovery preserves local authoring
When a complete-draft save or publish receives `CONTENT_REVISION_CONFLICT`, the
editor SHALL retain all current local form values and dirty state and SHALL
present an accessible conflict recovery state. That state SHALL offer explicit
actions to reload the current server draft or copy a stable JSON representation
of the local complete draft. Reloading SHALL replace local values only after
the user selects that action; copying SHALL not mutate the form. The editor
SHALL NOT automatically merge, reload, resubmit, or overwrite the local draft
after a revision conflict.

#### Scenario: A concurrent save conflicts
- **WHEN** a writer saves a changed draft and the API returns
  `CONTENT_REVISION_CONFLICT`
- **THEN** the writer's current title, slug, fields, and ordered blocks remain
  editable, and the editor offers reload-server-draft and copy-my-JSON actions

#### Scenario: Reload is explicitly chosen
- **WHEN** a writer selects reload-server-draft from a revision-conflict state
- **THEN** the editor fetches and adopts the validated current server draft,
  clears the conflict state, and does not issue another save or publish request

#### Scenario: Copy preserves the conflicted form
- **WHEN** a writer selects copy-my-JSON from a revision-conflict state
- **THEN** the editor copies the local complete-draft representation and leaves
  the same local values and conflict recovery state visible

### Requirement: Later draft edits remain separate from public output
After a successful publication, the editor SHALL adopt the returned entry as
its baseline and continue to treat later complete-draft edits as unpublished
local/draft changes. It SHALL present the current published snapshot separately
from the editable draft and SHALL not claim that a subsequent save changed the
published public output unless a later publication succeeds.

#### Scenario: A later save follows publication
- **WHEN** an admin publishes an entry and then saves a changed draft without
  publishing again
- **THEN** the editor shows the newer draft revision as unpublished changes and
  retains the prior published state/path as the current public output

### Requirement: The editor layout keeps actions and entry details at hand
The entry editor SHALL place its save-state indicator, its single Save action, and, for administrators, its Publish action in the shell header beside the breadcrumbs, so they stay visible while the editor scrolls. The save-state indicator SHALL distinguish unsaved changes, saving, a failed save with local changes kept, the saved revision, and view-only access in text. Save SHALL be available through the platform save shortcut (`⌘S` on Apple platforms, `Ctrl+S` elsewhere), which the Save control SHALL advertise visibly and programmatically. While the editor is mounted, the shortcut SHALL NOT open the browser's page-save behavior. The shortcut SHALL submit exactly like the Save control and SHALL do nothing when the draft is clean, a save is in progress, or the user cannot save. The title SHALL be presented as a prominent input with an accessible "Title" label. At wide viewports the editor SHALL show the title and blocks in a main column and the publication details and entry fields (collection slug and model fields) in a right-hand column. At narrow viewports that column SHALL follow the blocks in reading and keyboard order.

#### Scenario: A writer saves with the keyboard
- **WHEN** a writer changes the title and presses `Ctrl+S` (or `⌘S` on an Apple platform)
- **THEN** exactly one complete-draft request is sent, the browser does not open its save-page dialog, and the indicator changes from unsaved changes to saving to the saved revision

#### Scenario: The shortcut is pressed on a clean draft
- **WHEN** a writer presses the save shortcut without having changed the loaded draft
- **THEN** no draft-save request is sent and the browser's page-save behavior is still suppressed

#### Scenario: Header actions stay visible
- **WHEN** a writer scrolls a long entry
- **THEN** the breadcrumbs, the save-state indicator, Save, and (for admins) Publish remain visible in the header

#### Scenario: Entry fields sit in the right-hand column
- **WHEN** a collection entry with model fields is opened at a wide viewport
- **THEN** the title and blocks appear in the main column and the publication details, slug, and model fields appear in the right-hand column

### Requirement: Viewers see the editor read-only
When the signed-in role is `viewer`, the entry editor SHALL present the draft without Save, the save shortcut, or Publish. It SHALL present its field, slug, title, rich-text, and block controls as non-editable, and the save-state indicator SHALL read that the entry is view only. Media fields SHALL show their selected item without Choose media, Replace, or Remove. The API SHALL remain the authorization boundary for any request made independently of the editor.

#### Scenario: A viewer opens an entry
- **WHEN** a viewer opens a loaded entry
- **THEN** the editor shows the entry's title, fields, blocks, and publication details, offers no Save or Publish action, and does not accept edits to its controls

#### Scenario: A viewer presses the save shortcut
- **WHEN** a viewer presses the save shortcut in the editor
- **THEN** no draft-save request is sent
