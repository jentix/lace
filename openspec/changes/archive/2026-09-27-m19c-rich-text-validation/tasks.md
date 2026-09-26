## 1. API validation envelope

- [x] 1.1 Map `ContentValidationError` to `422 VALIDATION_FAILED` with code, message, and JSON Pointer in `app.onError`, and verify with `app.test.mjs` cases for invalid block rich text on save, a missing required field on publish, and an unknown field on create (D9)

## 2. Safe rich-text schema

- [x] 2.1 Add `@tiptap/extensions` 3.31.3 to the catalog and the admin package, and add `rich-text-extensions.ts` (SafeLink, SafeOrderedList, UndoRedo, Placeholder, EditorShortcuts); verify with a test that every toolbar action, a pasted link with extra attributes, and `<ol start>` produce documents accepted by `validateRichTextDocument` (D1)

## 3. Rich-text editor

- [x] 3.1 Build `LinkPopover` (prefill, `isSafeUrl` refusal with the allowlist sentence, insert on an empty selection, extend and set, Remove link, focus return) and verify with its component test (D3)
- [x] 3.2 Build `RichTextToolbar` (text-style Select, pressed toggles through `useEditorState`, tooltips with platform shortcuts, `aria-keyshortcuts`, roving tabindex, Escape to editor) and verify with its component test (D2)
- [x] 3.3 Rebuild `RichTextEditor` on the new extensions, toolbar, and popover, with textbox `id`, `aria-describedby`, `aria-invalid`, `aria-placeholder`, `⌘K` and `Alt+F10` callbacks, no toolbar when read-only, and placeholder CSS in `styles.css`; pass `invalid` from `RichTextField`; rewrite `RichTextEditor.test.tsx` (D1, D4)

## 4. Validation model

- [x] 4.1 Add `fieldProblem`, `serverIssueMessage`, and `issueLocation` to `editor-form.ts`, switch the resolver to sentence messages, and verify with `editor-form.test.ts` (D5, D6)
- [x] 4.2 Add `validation-problems.ts` (`validationProblems`, `blockLevelProblems`) and verify ordering, labels, and targets with its test (D7)

## 5. Editor surfaces

- [x] 5.1 Show block-level problems and the "Has problems" marker in `BlockCard`, render disallowed-type blocks with a synthetic definition in `BlockEditor`, give the Blocks heading `tabIndex=-1`, and verify with the BlockCard and BlockEditor tests (D8)
- [x] 5.2 Build `EntryValidationSummary` (count heading, located links that focus and scroll, unmapped text) and verify with its component test (D7)
- [x] 5.3 Wire `EntryPage`: `shouldFocusError: false`, `onInvalid` summary with focus, `applyServerIssues` for save and publish `VALIDATION_FAILED`, summary instead of `PageError`, clearing on success; update `EntryPage.test.tsx` expectations and add summary, server-mapping, publish-mapping, and clearing tests (D6, D7)

## 6. Browser tests, documentation, and verification

- [x] 6.1 Extend `e2e/editor.e2e.ts` with a rich-text block: toolbar and keyboard formatting, link popover, valid saved payload, and a mocked `422` whose summary link focuses the block field; run the non-acceptance Playwright suite (D10)
- [x] 6.2 Describe content validation envelopes in architecture §12 and the toolbar, link popover, shortcuts, placeholders, validation summary, and block-level errors in §17
- [x] 6.3 Run admin and server tests, root typecheck, lint (with boundary and color checks), format check, and `openspec validate m19c-rich-text-validation --type change --strict`
