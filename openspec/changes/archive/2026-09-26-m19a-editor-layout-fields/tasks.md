## 1. Shared building blocks

- [x] 1.1 Add the Lace-owned `shared/ui/Switch` (native `role="switch"` button over tokens) and verify with a `Switch` test for keyboard toggle, `aria-checked`, and disabled (D6)
- [x] 1.2 Add `shared/lib/save-shortcut.ts` (`useSaveShortcut`, `saveShortcutLabel`) and verify with unit tests for Meta/Ctrl+S prevention, ignored Alt/Shift variants, and the platform label (D2)
- [x] 1.3 Add `entryStatus(entry)` to `entities/content/draft.ts` and verify with `draft.test.ts` cases for draft, published, and changed (D5)

## 2. Shell header slot

- [x] 2.1 Make `ShellHeader` sticky, give it an actions target, add `ShellHeaderActions` with the portal and inline fallback, and verify with `ShellHeaderActions` and `AdminShell` tests that actions render in the header and leave with the screen (D1)

## 3. Field renderers

- [x] 3.1 Rebuild the Select, Date, Datetime (UTC), URL, Boolean, Number, text, and textarea renderers on the primitives with `invalid` and `readOnly` support, and add `readOnly` to `RichTextEditor`; verify with `FieldRenderer` tests for select clear, date and datetime composition, open link, switch, and `aria-invalid` (D6)

## 4. Editor page

- [x] 4.1 Restyle `PublishEntryDialog` with revision, path, and Cancel, and verify with its updated test that Cancel sends nothing (D7)
- [x] 4.2 Build `EntryPublicationDetails`, `EntryEditorActions`, `EntryConflictAlert`, and `DiscardChangesDialog` in the entry page slice, and verify each with a component test (relative times without ISO text, display name without IDs, the no-build text with a Builds link, the indicator states, and alertdialog Stay/Leave) (D3, D5, D7)
- [x] 4.3 Recompose `EntryPage` into the header slot, the two-column form with the viewer fieldset, the title input, and the save shortcut; update `EntryPage.test.tsx` for the new controls and add the shortcut, clean-shortcut, viewer read-only, publish-cancel, and discard-dialog tests (D2, D4)
- [x] 4.4 Update `BlockEditor` and other admin tests affected by the renderer changes, then verify the full admin unit suite passes

## 5. Browser tests, documentation, and verification

- [x] 5.1 Extend `e2e/editor.e2e.ts` with a `Control+S` save and header visibility after scrolling, and verify with a Playwright run of the non-acceptance suite
- [x] 5.2 Describe the editor layout, header actions, publication details, and field controls in architecture §17
- [x] 5.3 Run admin tests, root typecheck, lint, format check, and `openspec validate m19a-editor-layout-fields --type change --strict`
