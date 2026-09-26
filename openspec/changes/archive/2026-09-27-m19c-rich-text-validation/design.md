## Context

- `entities/content/RichTextEditor` builds a Tiptap v3 editor from individual
  extensions: document, paragraph, text, heading (levels 1–3), both lists,
  list item, blockquote, hard break, the four marks, and Link. Link is
  restricted by `isSafeUrl`. It has no undo history and no placeholder, and
  Tiptap's `useEditor` does not re-render on selection changes. Its toolbar is
  ten text buttons. Link uses `window.prompt`, and an unsafe URL writes
  `{ type: "invalid" }` into the field so that validation fails.
- Probing `getJSON()` showed that link marks serialize `target`, `rel`,
  `class`, and `title`, and ordered lists serialize `start` and `type`.
  `validateRichTextDocument` uses exact keys, so both fail today.
- The wrapper `<div id>` carries `aria-describedby`. The contenteditable has
  `role="textbox"` and `aria-label`, but it has neither the description nor
  `aria-invalid`. The field's `<label htmlFor>` points at the div, which is
  not labelable.
- `editor-form.ts` builds React Hook Form errors. Field and block-data
  messages come from `ContentValidationError.issues[0].message`, a lowercase
  fragment such as "does not conform to its field definition.". Block-level
  errors (`key`, `type`, `schemaVersion`) and data for undefined fields are
  produced, but `BlockCard` renders only errors for defined fields.
  `BlockEditor` skips blocks without a definition.
- `pointerToFormField` maps only `/title`, `/slug`, `/fields/<key>`, and
  `/blocks/<i>/data/<key>`, and only exact paths. `EntryPage` shows every save
  error through `PageError` and maps issues only for saves, not for publish.
  `useForm` uses the default `shouldFocusError`.
- `packages/server` `app.onError` maps `RequestValidationError`, the
  authorization error, and `classifyError` (domain errors, else 500).
  `validateEntryAggregate` throws `ContentValidationError` from inside
  `ContentUseCases`, so content rejections become `500 INTERNAL_ERROR`. Node
  and Cloudflare share this app.
- Boundary rules: each `.tsx` module is `<Folder>/<Folder>.tsx` with a test
  and `index.ts`. Entities cannot import widgets or pages.

## Goals / Non-Goals

**Goals:**

- The only documents rich text can produce are ones that pass validation.
- One place turns validation state into ordered, linkable problems. Local and
  server problems share it.
- Keep save semantics unchanged: one request per Save, local values kept on
  rejection, no automatic retry.

**Non-Goals:**

- Changing the shared rich-text allowlist or validator.
- Changing React Hook Form's revalidation mode.
- Localized or per-field configurable messages.

## Decisions

### D1 — Serialize only the allowlist, in `rich-text-extensions.ts`

The editor uses a new plain module
`entities/content/rich-text-extensions.ts` that builds the
extension list:

- `SafeLink` is `Link.extend({ addAttributes: () => ({ href }) })`, keeping
  `isAllowedUri: isSafeUrl`, `autolink: false`, `linkOnPaste: false`, and
  `openOnClick: false`. Its `HTMLAttributes` only render
  `rel="noopener noreferrer nofollow"`, so JSON never carries them.
- `SafeOrderedList` is `OrderedList.extend({ addAttributes: () => ({}) })`.
  The numeric input rule still creates a list, but ProseMirror drops the
  undeclared `start` attribute.
- `UndoRedo` and `Placeholder` come from `@tiptap/extensions`, pinned to
  3.31.3.
- A small `EditorShortcuts` extension binds `Mod-k` and `Alt-F10` to callbacks
  held in a ref, so the React component can open the link popover and focus
  the toolbar.

A test drives every toolbar action, a pasted `<a href target class>`, and an
`<ol start="3">` through the editor. It asserts that `validateRichTextDocument`
accepts each `getJSON()` result.

Alternative considered: normalizing JSON in `onUpdate`. That was rejected
because the editor state would still hold attributes that validation forbids,
and every future extension would need a matching normalizer.

### D2 — Toolbar state through `useEditorState`

`RichTextToolbar` (new `.tsx` folder) reads the following through
`useEditorState` with one selector:

- `isActive` for bold, italic, strike, code, bulletList, orderedList,
  blockquote, and link;
- the current text style (`heading` with its level, else `paragraph`);
- `can()` for undo.

The selector re-renders only when these values change.

The controls are:

- the text-style `Select` (shared Radix primitive) labelled "Text style";
- icon toggles (`Button` `icon-sm` ghost) with `aria-pressed`, `aria-label`,
  and `aria-keyshortcuts`, each wrapped in a `Tooltip` that shows the label
  and the platform shortcut (built with `isApplePlatform`);
- the Link popover trigger.

The toolbar has `role="toolbar"`, and its accessible name is `<field label>
formatting`, so several rich-text fields stay distinct. It uses a roving
`tabIndex`: one control has `tabIndex=0`, and ArrowLeft, ArrowRight, Home, and
End move between controls. Escape focuses the editor. The toolbar has its own
`TooltipProvider`, so it works outside `AdminApp` (unit tests). Choosing a text
style prevents Radix's focus return and focuses the editor instead.

Alternative considered: native `<select>` for text style. It was rejected to
match the 19A field controls, and because the Radix trigger already handles
arrow keys only while it is open, which leaves roving intact.

### D3 — Link popover replaces `window.prompt`

`LinkPopover` (new `.tsx` folder) is a controlled `Popover` whose trigger is
the toolbar's Link toggle. `⌘K` opens it through D1's callback. On opening:

- the input "Link URL" is prefilled with `editor.getAttributes("link").href`;
- Radix autofocus puts focus in the input.

Submitting trims the value. An empty value or one that fails `isSafeUrl`
shows an error with the text "Links must start with https://, http://,
mailto:, tel:, / or #." The input is marked `aria-invalid` and described by
that error. The document does not change.

A valid value takes one of two paths:

- With an empty selection outside a link, the editor inserts the URL as text
  with a link mark.
- Otherwise it runs `extendMarkRange("link").setLink({ href })`.

Remove link, shown only when a link is active, runs
`extendMarkRange("link").unsetLink()`. `onCloseAutoFocus` prevents Radix's
return to the trigger and focuses the editor. ProseMirror keeps its selection
while the input has focus, so the command applies to the original selection.

### D4 — Accessible editor surface and placeholders

The ProseMirror element receives these attributes from `editorProps`:

- `id` (the field id);
- `role="textbox"` and `aria-multiline="true"`;
- `aria-label`;
- `aria-describedby`;
- `aria-invalid` when invalid;
- `aria-placeholder="Write something…"` while editable.

The attributes are a function over refs, so later prop changes apply without
re-creating the editor. `RichTextField` passes `invalid`. Summary links then
focus the textbox directly.

`Placeholder` shows "Write something…" on the empty current paragraph and
"Heading N" on an empty heading. It uses the default `showOnlyWhenEditable`.
`styles.css` adds the `p.is-empty::before` / `h*.is-empty::before` rule with
`content: attr(data-placeholder)` in `text-muted-foreground`, and
`pointer-events: none`. Read-only editors render no toolbar.

### D5 — Sentence messages from one function

`editor-form.ts` gains `fieldProblem(definition, value): string | undefined`.
It first calls `validateFieldValue`. On failure it returns a sentence chosen
by descriptor type:

- text and textarea: a length message using `minLength`/`maxLength`;
- number: a range message;
- select: "Choose one of the listed options.";
- date: "Choose a valid date."; datetime: "Choose a valid date and time.";
- url: "Enter a URL that starts with https://, http://, mailto:, tel:, / or #.";
- media: "Choose a media item.";
- boolean: "Choose on or off.";
- rich text: `validateRichTextDocument` supplies the first issue code. For
  `unsafe_url` the message is the D3 link sentence. For unknown or misplaced
  nodes and marks it is "Remove formatting that is not supported here.".
  Anything else gets "This text could not be read. Undo the last change or
  clear the field.".

The resolver uses `fieldProblem` for model fields and block data. Block-level
messages become:

- "This block type is not allowed by the model."
- "This block version is not current."
- "This block's key is not valid."
- "This block's key duplicates another block."
- "This block has data for the undefined field “<key>”."

`serverIssueMessage(issue, definition?, value?)` covers server issues:

- `invalid_field_value` with a known definition → `fieldProblem` of the
  current value.
- `missing_required_field` → "This field is required to publish."
- `missing_slug` → "A slug is required to publish."
- `unknown_field` → "This field is not defined by the model."
- Block type, version, and key codes → the block sentences above.
- Otherwise the server message, capitalized.

Messages never include the value.

### D6 — Extended pointer mapping

`pointerToFormField` becomes `issueLocation(path, model, blocks)` and returns
a form path or `undefined`:

- `/title`, `/slug`, and `/fields/<key>/…` map to their fields; anything below
  the field key maps to the field.
- `/blocks/<i>/data/<key>/…` maps to `blocks.<i>.data.<key>` when the block's
  definition has that field.
- For an undefined key the result is `blocks.<i>.data.<key>`, which D7 shows
  at block level.
- `/blocks/<i>/key|type|schemaVersion` maps to that path.
- `/blocks/<i>` and `/blocks/<i>/data` map to `blocks.<i>.block`, a synthetic
  block-level key.
- `/blocks` maps to `blocks.root`, React Hook Form's array-level error slot.
- `/blocks/<i>` for an index outside the local list maps to `undefined`.

`EntryPage.applyServerIssues(issues)` runs `setError(path, { type: "server",
message })` for each mapped issue. It collects unmapped messages into state
and requests the summary. Both the save and the publish `onError` call it when
`error.code === "VALIDATION_FAILED"`.

### D7 — Validation summary model and component

`entities/content/validation-problems.ts` exports
`validationProblems(errors, model, blocks, unmapped)`. It returns ordered
`{ id, label, message, target }` items, where `target` is one of:

- `{ kind: "control", id }`
- `{ kind: "block", key }`
- `{ kind: "blocks" }`
- `undefined`

The order follows D6's reading order:

1. title;
2. `blocks.root`;
3. for each block by index: block-level messages (key, type, schemaVersion,
   block, undefined data fields), then field messages in definition order;
4. slug;
5. model fields in model order;
6. unmapped server messages.

Labels:

- block fields: "<Field> in <Block label> block <n>";
- block-level problems: "<Block label> block <n>";
- the block list: "Blocks".

Block labels use `fieldLabel(type, label)`, the same derivation as
`blockLabel`. Control ids reuse the `FieldRenderer` convention
(`field-<name with dots as dashes>`), `system-title`, and `system-slug`.

`pages/entry/EntryValidationSummary` (new `.tsx` folder) renders a
`role="alert"` section with `tabIndex=-1`:

- the heading "There is 1 problem to fix" or "There are N problems to fix";
- a list of entries. A located entry is `<a href="#<id>">label</a>` followed
  by the message. Its click handler prevents navigation, focuses the target,
  and calls `scrollIntoView({ block: "center" })`.

Target resolution:

- control → `document.getElementById(id)`;
- block → `[data-block-key]`;
- blocks → the `blocks-title` heading, which gets `tabIndex=-1`.

A field inside a block with an error is already expanded (19B), so its
control exists.

`EntryPage` changes:

- `useForm({ shouldFocusError: false })`.
- `handleSubmit(onValid, onInvalid)`. `onInvalid` shows the summary and
  focuses it.
- The summary renders while it is requested and `validationProblems` is
  non-empty. It sits in place of `PageError` for validation rejections.
- A new submit attempt clears unmapped messages.
- A successful save or reload hides the summary.

React Hook Form's default `reValidateMode: "onChange"` removes entries as the
writer fixes them.

Alternative considered: letting React Hook Form focus the first invalid field.
That was rejected because block controls are `Controller`s without refs, so
it could reach only the title. The summary also gives an overview.

### D8 — Block-level errors in `BlockCard`; cards for disallowed types

`BlockCard` computes its block-level messages with a shared helper
(`blockLevelProblems(error, definition)`, exported from
`validation-problems.ts` so the summary and the card agree). When a block has
any error:

- a destructive list of those messages renders under the header;
- the header shows an "Has problems" marker (icon plus text);
- the card border uses `border-destructive`.

The active highlight is still applied on top of it.

In `BlockEditor`, a block whose type has no allowed definition renders with
the synthetic definition `{ fields: {}, type, version: schemaVersion }`:

- `blockIcon` falls back to the default icon;
- `blockLabel` derives the label from the type;
- the resolver reports the type error.

Remove and Undo work as for any block. Duplicate stays available. It produces
another invalid block, which the error makes visible.

### D9 — `ContentValidationError` at the HTTP boundary

`app.onError` gains a branch before `classifyError`:

```ts
error instanceof ContentValidationError
  ? validationResponse(error.issues.map((issue) => ({
      code: issue.code, message: issue.message, path: pointer(issue.path),
    })))
```

`pointer` already escapes `~` and `/`. The package boundary forbids `server`
from importing `@lacecms/content`, so `@lacecms/application` re-exports
`ContentValidationError` as part of its use-case error surface, and the server
imports it from there. Content messages are static strings, and some embed configured
limits. They never embed submitted values. The envelope schema already allows
`details.issues`, so neither OpenAPI nor contracts change.

Tests in `app.test.mjs` cover three cases:

- a draft save with an invalid block rich-text node returns `422` with path
  `/blocks/0/data/body`, and a reload shows the revision unchanged;
- a publish missing a required field returns `422` with
  `/fields/<key>` and `missing_required_field`, and the entry is still
  unpublished;
- entry creation with an unknown field returns `422` with `/fields/<key>`.

Alternative considered: converting inside `ContentUseCases` into a
`DomainError`. That was rejected because domain errors carry no issue list, and
the transport already owns envelope shaping.

### D10 — Tests and documentation

- **Unit tests:**
  - `rich-text-extensions`: the D1 validity test.
  - `RichTextToolbar`: pressed state, text-style change, roving keys, Escape,
    and tooltips.
  - `LinkPopover`: prefill, unsafe refusal, insert on an empty selection,
    remove, and focus return.
  - `RichTextEditor`: toolbar name, `aria-*` on the textbox, placeholder,
    read-only without toolbar, `⌘K`, and `Alt+F10`.
  - `editor-form`: `fieldProblem`, `serverIssueMessage`, and `issueLocation`.
  - `validation-problems`: order, labels, and targets.
  - `EntryValidationSummary`: count heading, links focus targets, and
    unmapped text.
  - `BlockCard`: block-level list and marker.
  - `BlockEditor`: disallowed-type card is removable.
  - `EntryPage`: summary on invalid Save, server mapping for save and
    publish, summary clears, and updated message expectations.
- **End-to-end:** `e2e/editor.e2e.ts` adds a rich-text block definition to
  the mocked model. A new test formats with the toolbar and keyboard, links
  through the popover, saves, and checks the payload validates. It then
  triggers a mocked `422` and follows the summary link to the block field.
- **Architecture:** §12 states that content validation maps to
  `VALIDATION_FAILED`. §17 describes the toolbar, link popover, shortcuts,
  placeholders, the validation summary, and block-level errors.

## Risks / Trade-offs

- [Tiptap attribute overrides could drift on a Tiptap upgrade] → D1's test
  asserts validator acceptance for every action and paste, so an upgrade that
  reintroduces attributes fails CI.
- [Radix Select, Popover, and Tooltip inside a roving toolbar can fight over
  focus] → Explicit `onCloseAutoFocus` handling, plus tests that assert focus
  after each interaction.
- [`Mod-k` is a browser shortcut in some browsers] → ProseMirror handles it
  only while the editor has focus, and it calls `preventDefault`. The toolbar
  button remains the non-shortcut path.
- [Many `role="alert"` field errors plus the summary may be announced
  together] → Focus moves to the summary, which is announced first. Field
  errors keep their association for when each control is reached.
- [Server errors on untouched fields persist until the next submit, because
  React Hook Form revalidates only the changed field] → Acceptable. The next
  Save re-runs the resolver and clears stale server errors, and the summary
  reflects the current error state.
- [Existing drafts saved with the old editor never contained link or ordered
  list attributes, since those saves failed validation] → No data migration
  is needed.

## Migration Plan

This change needs no data or configuration migration. The admin and the
server ship together. An older admin against the new server sees `422`
instead of `500`, which it already renders through `PageError`. Rollback
means reverting the commit.
