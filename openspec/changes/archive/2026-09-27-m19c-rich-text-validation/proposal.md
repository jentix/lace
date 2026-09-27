## Why

Roadmap Step 19 (Block editor), Session 19C. After 19A and 19B, the editor's
layout and block cards are in place, but rich text and validation still fall
short of Step 19's outcome:

- The rich-text toolbar is a wrapping row of text buttons. It has one heading
  level, no active states, and no undo history. Links are entered through
  `window.prompt`.
- Applying a link or a numbered list breaks the draft. Tiptap serializes link
  marks with `target`, `rel`, `class`, and `title` attributes and ordered lists
  with `start` and `type`. The shared rich-text validator rejects both, so the
  field reports "does not conform to its field definition" right after a normal
  edit.
- Errors appear only beside individual fields. The writer gets no overview and
  no way to jump to a problem. Block-level errors (disallowed type, stale
  version, duplicate key) are computed but never shown. A block whose type is
  not allowed is not rendered at all, so Save fails with no visible reason.
- The server rejects invalid content with `500 INTERNAL_ERROR` instead of the
  documented `422 VALIDATION_FAILED` with JSON Pointer issues. The
  aggregate validator's `ContentValidationError` is not mapped at the HTTP
  boundary, so server rejections never reach their fields.

This change follows architecture §11 (a shared, explicit rich-text allowlist),
§12 (sanitized error envelopes), and §17 (the admin editor). It modifies the
accepted `admin-draft-editor` and `rest-contracts` specs.

## What Changes

- **Fixed rich-text toolbar.** Each rich-text field gets one toolbar, named
  after its field, with these controls:
  - A text-style menu: Paragraph and Heading 1–3.
  - Bold, Italic, Strike, and Code toggles.
  - Bulleted list, Numbered list, and Quote toggles.
  - A Link control.
  Toggles report their pressed state for the current selection. The toolbar
  is one tab stop with arrow-key movement (WAI-ARIA toolbar pattern). Each
  control names its keyboard shortcut in a tooltip and in `aria-keyshortcuts`.
  Viewers see no toolbar.
- **Link popover.** The Link control and `⌘K`/`Ctrl+K` open a popover with a URL
  input:
  - It shows the current link's URL when there is one.
  - It accepts only URLs that pass the shared `isSafeUrl` allowlist and states
    the permitted forms when a URL is rejected.
  - Apply sets the link, and Remove link removes it. With no selection, Apply
    inserts the URL as linked text.
  - Escape closes the popover and returns focus to the editor.
  `window.prompt` and the `{ type: "invalid" }` sentinel value are removed.
- **Safe serialization.** Link marks serialize only `href`, and ordered lists
  serialize no attributes. Every toolbar action therefore produces a document
  that passes `validateRichTextDocument`. Pasted HTML is reduced to the same
  schema.
- **Keyboard shortcuts and placeholders.** Undo and redo (`⌘Z`, `⌘⇧Z`) are
  added. The editor keeps the Tiptap mark, list, quote, and heading shortcuts
  (`⌘⌥1`–`⌘⌥3`, `⌘⌥0` for paragraph) and the Markdown input rules, and adds
  `Shift+Enter` for a line break, `⌘K` for the link popover, and `Alt+F10` to
  move focus to the toolbar. An empty editor shows a "Write something…"
  placeholder, and an empty heading shows "Heading N". The placeholder is
  exposed through `aria-placeholder`.
- **Clearer field messages.** Local validation states what is wrong in a full
  sentence. Examples: "Enter at least 5 characters.", "Links must start with
  https://, http://, mailto:, tel:, / or #.", "Choose one of the listed
  options." It no longer shows the validator's "does not conform…" fragment.
  Server issue codes map to the same kind of sentence.
- **Block-level errors.** A block card with any error is marked invalid in
  text, not only by color. It shows its block-level messages (type not
  allowed, version not current, key problems, undefined data fields) inside
  the card. A block whose type the model no longer allows still renders as a
  card with a default icon and its error. The writer can then remove it.
- **Validation summary.** When Save is blocked by local validation or rejected
  by the server with field issues, an alert summary appears above the title and
  receives focus. It states how many problems were found. It lists each
  problem in reading order as a link that names the field (and its block and
  position, for block fields). The first block problem therefore links to the
  first invalid block. Activating a link focuses that control and scrolls it
  into view. Issues without a mappable location are listed as text. The
  summary replaces the generic error panel for validation rejections and
  disappears when the errors are resolved.
- **Server rejections map to the same locations.** The admin maps server JSON
  Pointers to fields, block fields, block-level properties, and the block list.
  Deeper pointers, for example into a rich-text document, map to their owning
  field. Publish validation rejections use the same mapping.
- **API validation envelope.** The Hono app maps `ContentValidationError` from
  draft save, entry creation, and publication to `422 VALIDATION_FAILED`. Each
  issue carries its code, its safe message, and a JSON Pointer path.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `admin-draft-editor`: the rich-text requirement adds the fixed toolbar, the
  link popover, shortcuts, placeholders, and safe serialization. A new
  requirement covers field, block-level, and block-list problems; invalid
  cards for disallowed types; the validation summary; and server JSON Pointer
  mapping for save and publish.
- `rest-contracts`: the error-envelope requirement adds that content
  aggregate validation failures use `VALIDATION_FAILED` with JSON Pointer
  issue paths.

## Impact

- `packages/application` re-exports `ContentValidationError` as part of its
  use-case error surface.
- `packages/server`: `app.onError` maps `ContentValidationError`. New tests
  cover draft save and publish rejections.
- `apps/admin`:
  - `entities/content/RichTextEditor` is rebuilt, with new internal
    `RichTextToolbar`, `LinkPopover`, and `rich-text-extensions.ts` modules.
  - `entities/content/editor-form.ts` gains specific field messages, pointer
    mapping for block-level and deep paths, and a validation-summary model.
  - `pages/entry` gains `EntryValidationSummary`.
  - `widgets/block-editor/BlockCard` shows block-level errors.
  - `BlockEditor` renders cards for disallowed types.
  - `styles.css` adds placeholder styles.
- New dependency: `@tiptap/extensions` (Placeholder, UndoRedo) at the pinned
  Tiptap version 3.31.3.
- Tests: RichTextEditor, FieldControls, editor-form, EntryPage, BlockCard,
  and BlockEditor unit tests change. The `editor.e2e.ts` spec gains a
  rich-text and validation summary check.
- No database, SDK, OpenAPI schema, or configuration change. The error
  envelope schema already allows `details.issues`.
- Dependencies on accepted work:
  - 16B primitives: Popover, Tooltip, Select, and Button.
  - 19A field renderers and header Save.
  - 19B block cards and error-forced expansion.
- Non-goals:
  - Configurable per-field placeholders in the field DSL.
  - Tables, images, or embeds inside rich text.
  - A bubble or floating menu.
  - Autosave.
  - Server-side issue messages localized per field type.
  - Validation of media availability beyond today's `CONTENT_INVALID_STATE`.
