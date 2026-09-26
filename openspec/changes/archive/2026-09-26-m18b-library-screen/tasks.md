## 1. Foundations

- [x] 1.1 Add `react-dropzone` to the workspace catalog and `apps/admin/package.json`; verify `pnpm install` succeeds and the lockfile pins it (D8)
- [x] 1.2 Add `formatBytes` to `shared/lib` and `mediaTypeLabel`, `validateMediaFile`, and `MediaThumbnail` (lazy `<img>` with fallback) to `entities/media`; give `MediaPreview` a `className` prop; verify with unit/component tests (D3, D5, D7)
- [x] 1.3 Replace `adminQueryKeys.media(cursor)` with the `media` prefix plus `mediaList(query)`, and migrate every caller; verify admin typecheck (D2)
- [x] 1.4 Add the upload progress transport (`uploadMedia(file, { onProgress })`, XHR default uploader, fetch fallback, shared error mapping) to the admin client; verify admin-client tests cover XHR progress, XHR error envelopes, network failure, and the fetch path (D4)

## 2. Upload and deletion features

- [x] 2.1 Implement `useMediaUploads` (queue, concurrency 2, local rejection without requests, per-file server errors, retry, dismiss, clear, invalidation) and verify with hook tests (D5)
- [x] 2.2 Implement `useMediaDropzone`, `DropOverlay`, and `UploadQueue` (progressbar, live summary, retry/dismiss) and verify with component tests (D5)
- [x] 2.3 Implement `DeleteMediaDialog` over `useMediaDeletion` with confirmation, cancel focus return, and refusal messages; verify with component tests (D6)

## 3. Library screen

- [x] 3.1 Add `parseMediaSearch` and wire `validateSearch` on the `/media` route and `MediaPage` URL read/write; verify parser tests for valid, invalid, and default values (D2)
- [x] 3.2 Move the picker's selection-mode library into widget-internal `MediaChoices` used by `MediaPicker`; verify existing picker and block-editor tests still pass (D1)
- [x] 3.3 Build `MediaToolbar`, `MediaGrid`, and `MediaListTable` and verify with component tests (lazy attribute, status badges, list columns, pressed states) (D7)
- [x] 3.4 Build `MediaDetailsPanel` (facts, usage states and truncation, entry links, copy URL, writer actions, focus return) and verify with component tests (D6)
- [x] 3.5 Compose the new `MediaLibrary` (URL query, infinite list with `keepPreviousData`, empty/no-match/error states, drop zone, upload button, queue, details) and verify route-level tests for reload restoration, pagination restart, mixed multi-file drop, viewer affordances, and deletion flows (spec scenarios)

## 4. Browser tests, documentation, and verification

- [x] 4.1 Update `apps/admin/e2e` library steps (multi-file upload label, upload row, details panel) and verify with a Playwright run of the non-acceptance suite
- [x] 4.2 Note the rebuilt library, upload transport, and dependency in architecture where the admin media surface is described
- [x] 4.3 Run admin tests, root typecheck, lint, format check, and `openspec validate m18b-library-screen --type change --strict`
