## 1. Reusable parts

- [x] 1.1 Give `MediaGrid` a `mode: "open" | "choose"` and `currentId` (no `aria-haspopup` in choose mode, `aria-current` plus a check badge on the current tile) and verify with `MediaGrid` component tests (D2)
- [x] 1.2 Make the `MediaToolbar` view toggle optional (rendered only with `onViewChange`) and verify with a `MediaToolbar` test (D2)
- [x] 1.3 Add the optional `onChoose` "Use <filename>" action for uploaded rows to `UploadQueue` and verify with an `UploadQueue` test that the library queue is unchanged without it (D3)

## 2. Picker

- [x] 2.1 Build `SelectedMedia` (detail read with a placeholder, loading, active, deleting, delete_failed, not-found, and error-with-retry states, Replace and Remove, no raw ID) and verify with component tests (D4)
- [x] 2.2 Build `MediaPickerDialog` (local query reset per open, active-only grid in choose mode, toolbar without view, states, pagination, writer-only drop zone, multi-file upload, and queue with Use) and verify through `MediaPicker` tests (D2, D3)
- [x] 2.3 Rewrite `MediaPicker` over the dialog and card with focus return after choose, dismiss, and Remove; delete `MediaChoices` and `MediaUpload` and their exports; and verify with the rewritten `MediaPicker` tests covering the spec scenarios (D1, D5, D6)
- [x] 2.4 Update `BlockEditor` and `EntryPage` tests to choose inside the dialog and assert the filename card, then verify the admin unit test suite passes (D6)

## 3. Browser tests, documentation, and verification

- [x] 3.1 Add the editor picker e2e flow (block media field, multi-file upload with one server failure, Use, save payload, Escape dismissal with focus return), scope the acceptance choice to the dialog, and verify with a Playwright run of the non-acceptance suite
- [x] 3.2 Describe the picker dialog and the selected-media card in architecture §17 next to the media library paragraph
- [x] 3.3 Run admin tests, root typecheck, lint, format check, and `openspec validate m18c-media-picker --type change --strict`
