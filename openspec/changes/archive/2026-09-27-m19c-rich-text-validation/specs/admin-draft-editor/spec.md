## MODIFIED Requirements

### Requirement: Rich text is edited only through the shared safe document subset
The editor SHALL provide rich-text controls for model rich-text fields and
rich-text block fields that create and edit the shared structured document
format. It SHALL enable only the shared allowed nodes, marks, heading levels,
and link URL forms, and SHALL not enable raw HTML input, HTML nodes, arbitrary
attributes, inline event handlers, styles, or unsafe link schemes. Every
document the editor produces, whether through the toolbar, a keyboard
shortcut, an input rule, or paste, SHALL pass the shared rich-text validation;
link marks SHALL carry only their URL and lists SHALL carry no attributes.
Invalid rich-text values SHALL expose an accessible local field error and SHALL
not cause a complete-draft request.

Each editable rich-text field SHALL show a fixed toolbar named after its field.
The toolbar SHALL offer the following controls:

- a text-style choice of Paragraph, Heading 1, Heading 2, and Heading 3;
- Bold, Italic, Strike, and Code toggles;
- Bulleted list, Numbered list, and Quote toggles;
- a Link control.

Each toggle SHALL expose whether its format is active at the current
selection, and the text-style choice SHALL show the current block's style. The
toolbar SHALL be a single tab stop whose controls are reached with the arrow,
Home, and End keys. Each control whose action has a keyboard shortcut SHALL
name it visibly on hover or focus and programmatically. The editor SHALL
support these shortcuts: undo and redo; the bold, italic, strike, and code
marks; the lists, quote, heading, and paragraph styles; `Shift+Enter` for a
line break; `⌘K`/`Ctrl+K` to open the link control; and `Alt+F10` to move focus
from the text to the toolbar. Escape SHALL return focus from the toolbar to the
text.

The Link control SHALL open a labelled URL input prefilled with the current
link's URL. It SHALL accept only URLs permitted by the shared allowlist; a
rejected URL SHALL leave the document unchanged and show an accessible error
that states the permitted forms. Applying a URL SHALL link the selection, or
the whole existing link when the cursor is inside one, or insert the URL as
linked text when nothing is selected. A Remove link action SHALL remove the
link. Closing the control SHALL return focus to the text without changing the
document.

An empty editable rich-text field SHALL show a placeholder that is also exposed
to assistive technology, and an empty heading SHALL show its heading level as
a placeholder. A read-only rich-text field SHALL show no toolbar and no
placeholder.

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

#### Scenario: A link and a numbered list stay valid
- **WHEN** a writer links selected text to `https://example.com` and turns a
  paragraph into a numbered list
- **THEN** the stored document passes the shared rich-text validation, the link
  mark carries only its URL, and the next Save sends a complete-draft request

#### Scenario: An unsafe link is refused in the link control
- **WHEN** a writer enters `javascript:alert(1)` in the link control and applies
  it
- **THEN** the control shows an error naming the permitted URL forms, the
  document is unchanged, and the field shows no validation error

#### Scenario: The toolbar reflects the selection
- **WHEN** a writer places the cursor inside bold text in a Heading 2
- **THEN** the Bold toggle reports that it is pressed and the text-style
  control shows Heading 2

#### Scenario: A writer formats with the keyboard only
- **WHEN** a writer presses `Alt+F10` in the text, moves to Italic with the
  arrow keys, activates it, and presses Escape
- **THEN** italic is toggled at the selection and focus returns to the text

#### Scenario: A writer opens the link control with the keyboard
- **WHEN** a writer selects text and presses `⌘K` or `Ctrl+K`
- **THEN** the link control opens with focus in its URL input

#### Scenario: An empty field shows its placeholder
- **WHEN** an editable rich-text field has no text
- **THEN** it shows a placeholder that is exposed as the control's accessible
  placeholder, and a viewer sees neither the placeholder nor the toolbar

## ADDED Requirements

### Requirement: Validation problems are shown where they occur and summarized
Every local or server validation problem SHALL be shown at its location. A
field problem SHALL be shown on its field. A block problem that belongs to no
single field SHALL be shown inside that block's card, together with a text
marker that the block has problems. Such problems include a disallowed or
unregistered type, a version that is not current, a missing, malformed, or
duplicate key, and data for an undefined field. A problem with the block list
as a whole SHALL be shown with the block list. An existing block whose type the
model no longer allows SHALL still render as a card with a default icon, its
type as label, and its problem, so the writer can remove it. Field messages
SHALL be complete sentences that state what is wrong or what to enter. They
SHALL NOT repeat validator-internal phrasing and SHALL NOT include the
rejected value.

When local validation blocks a Save, or the server rejects a save or publish
with validation issues, the editor SHALL show a validation summary above the
title and move focus to it. The summary SHALL state the number of problems. It
SHALL list each problem in the editor's reading order: the title, then each
block in order, then the slug, then the model fields. Each entry SHALL be a
link that names the field and, for a block field, the block's label and
position. Activating an entry SHALL move focus to that control, or to the
block card for a block problem, and scroll it into view. Because the list
follows reading order, the first block entry links to the first invalid
block. A server issue whose path does not match a visible location SHALL be
listed as text without a link. The summary SHALL replace the generic failure
message for validation rejections. It SHALL update as problems are resolved
and disappear when none remain.

The editor SHALL map server JSON Pointer issue paths as follows:

- `/title`, `/slug`, and `/fields/<key>` map to their controls.
- `/blocks/<index>/data/<key>` maps to that block's field.
- `/blocks/<index>/key`, `/type`, and `/schemaVersion`, as well as
  `/blocks/<index>` and `/blocks/<index>/data`, map to that block.
- `/blocks` maps to the block list.

A deeper pointer below a field, such as a path into a rich-text document,
SHALL map to that field. Mapping SHALL preserve the writer's complete local
draft and dirty state.

#### Scenario: Local validation blocks a save
- **WHEN** a writer saves a draft whose second block has a text field below its
  minimum length and whose model field has an unsafe URL
- **THEN** no draft-save request is sent, focus moves to a summary stating two
  problems, the first entry names the block's label, its position 2, and the
  field, and each field shows a complete-sentence message

#### Scenario: A summary link reaches the first invalid block
- **WHEN** a writer activates the summary entry for a field in a collapsed block
- **THEN** the block is expanded, the field's control receives focus, and it is
  scrolled into view

#### Scenario: Server issues map to the same locations
- **WHEN** the server rejects a save with issues at
  `/blocks/0/data/body/content/0` and `/fields/summary`
- **THEN** the first block's Body field and the Summary field show the
  rejection, the summary lists both with links, and the local values remain
  unchanged and dirty

#### Scenario: A server issue has no visible location
- **WHEN** the server rejects a save with an issue at a path the editor cannot
  map
- **THEN** the summary lists that issue's message as text without a link and
  no field is marked invalid

#### Scenario: A block of a disallowed type is loaded
- **WHEN** a writer opens an entry containing a block whose type the model no
  longer allows
- **THEN** the block renders as a card marked as having problems, states that
  its type is not allowed, and can be removed, after which Save is no longer
  blocked by it

#### Scenario: A publish is rejected with validation issues
- **WHEN** an admin publishes a draft and the server rejects it because a
  required model field is missing for publication
- **THEN** that field shows that it is required to publish and the summary
  links to it

#### Scenario: Fixing problems clears the summary
- **WHEN** a writer corrects every listed problem and saves again
- **THEN** the summary disappears and exactly one complete-draft request is
  sent
