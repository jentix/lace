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
unvalidated descriptor data from a response. Editable values SHALL be locally
validated against the same client-safe descriptor constraints before save, and
each field error SHALL be programmatically associated with its control.

#### Scenario: A configured form is loaded
- **WHEN** an authenticated writer opens an entry whose model has text, number,
  boolean, select, date, datetime, URL, media, textarea, or rich-text fields
- **THEN** the draft values appear in controls generated from their descriptor
  metadata with accessible labels, descriptions where configured, and the
  descriptor-appropriate constraints

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
it SHALL require the writer to explicitly choose whether to leave; choosing to
stay SHALL retain the current local values. Loading, local-validation, saving,
saved, and save-failure states SHALL be distinguishable without relying only on
color.

#### Scenario: A dirty writer navigates away
- **WHEN** a writer changes a field and then attempts to navigate away from the
  entry route
- **THEN** the application asks for explicit confirmation before discarding the
  draft and retains the local values when the writer chooses to remain

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
Generic block fields SHALL render from their validated portable metadata. A
media field SHALL offer a clearly labelled selection placeholder backed by the
authenticated media list, permit choosing an active media item as its stored
media identifier, and expose loading, empty, and failure states without
silently changing the draft. The editor SHALL associate server validation
issues at model-field, block-data, rich-text, or URL paths with the matching
visible control while preserving the writer's complete local draft.

#### Scenario: A writer selects media for a block
- **WHEN** the media list loads and a writer selects an active item for a block
  media field
- **THEN** the generic block form displays the selection and includes that media
  identifier in the next complete-draft save

#### Scenario: Block validation fails on save
- **WHEN** the server rejects a block data field, rich-text value, or URL with a
  documented JSON Pointer issue
- **THEN** the editor preserves the local ordered block list and attaches an
  accessible error to the corresponding model or block field

### Requirement: The editor makes publication and draft concurrency explicit
The authenticated entry editor SHALL display the current draft revision, its
last editor identity and update time, current published state, and resolved
canonical public path when the model and draft make one available. It SHALL
display the distinct result of the most recent publish attempt, including that
publication succeeded while its build is pending, unavailable, rejected, or
not dispatched; it SHALL not represent that build-dispatch result as confirmed
public-site availability. Only an `admin` role SHALL be offered publication.
Before an admin publishes, the editor SHALL require explicit confirmation and
submit the current draft revision with a non-empty idempotency key. The browser
SHALL retain that key while retrying the same pending/failed network publish
attempt and SHALL replace it only after the attempt reaches a terminal server
response or the user starts a new confirmed publish attempt.

#### Scenario: An admin reviews publication state
- **WHEN** an admin opens a loaded entry with a collection slug and a current
  published snapshot
- **THEN** the editor shows its draft revision and editor/time, published state,
  resolved canonical public path, and a publication/build status that does not
  claim a pending build has succeeded

#### Scenario: An editor cannot publish
- **WHEN** an `editor` opens a loaded entry
- **THEN** the editor does not offer a publish action, while the API remains the
  authorization boundary if a publication request is attempted independently

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
