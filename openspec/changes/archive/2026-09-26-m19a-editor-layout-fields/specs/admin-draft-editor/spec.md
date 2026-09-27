## ADDED Requirements

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

## MODIFIED Requirements

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
