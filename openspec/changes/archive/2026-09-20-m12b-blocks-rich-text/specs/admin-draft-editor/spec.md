## ADDED Requirements

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
