## 1. Block display metadata

- [x] 1.1 Add labels and descriptions to the five `builtInBlocks` and verify with content tests that each built-in projects a label and description (D1)
- [x] 1.2 Add a config test proving a block description changes the projection hash but not the structure hash, and verify the config package tests pass (D1)

## 2. Presentation helpers

- [x] 2.1 Add `widgets/block-editor/block-presentation.ts` (`blockIcon`, `blockLabel`, `blockSummary`, `matchesBlockFilter`) and verify with `block-presentation.test.ts` for icon fallback, summary priority, rich-text plain text, media-only, empty, truncation, and filter matching (D2)

## 3. Block components

- [x] 3.1 Build `AddBlockMenu` (named popover dialog, filter, option icons and descriptions, arrow-key navigation, single-match Enter, no-match status) and verify with its component test (D6)
- [x] 3.2 Build `BlockCard` (grip handle, icon, truncating label and summary, collapse toggle with `aria-expanded`, actions menu with edge-disabled moves, active styling, error-forced expansion, hidden-but-mounted fields) and verify with its component test (D4)
- [x] 3.3 Build `RemovedBlockNotice` (status text, Undo, Dismiss) and verify with its component test (D5)

## 4. Block editor

- [x] 4.1 Recompose `BlockEditor` with insert slots, the final Add block control, active and focus state, duplicate-after-source, and remove with undo; rewrite `BlockEditor.test.tsx` for insert with filter, no match, duplicate focus, menu moves, collapse summary, undo restoring key and data, finalized removal, error expansion, active highlight, and the saved order with ULID keys (D3, D5)
- [x] 4.2 Update `EntryPage.test.tsx` and `MediaPicker.test.tsx` to add blocks through the Add block menu and verify the full admin unit suite passes (D7)

## 5. Browser tests, documentation, and verification

- [x] 5.1 Update `e2e/editor.e2e.ts` for the Add block menu, add a keyboard drag-handle reorder check, update `e2e/acceptance.e2e.ts`, and verify with a Playwright run of the non-acceptance suite (D7)
- [x] 5.2 Describe block cards, the Add block menu, and remove with undo in architecture §17 and built-in block descriptions in §11
- [x] 5.3 Run admin, content, and config tests, root typecheck, lint, format check, admin boundary check, and `openspec validate m19b-block-cards --type change --strict`
