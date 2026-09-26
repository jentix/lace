## 1. Authenticated media client

- [x] 1.1 Add validated upload, delete-request, and retry-deletion operations to the credentialed admin client, including multipart `file` and safe API-error mapping; verify focused client tests for success, authorization, validation, and network failure.
- [x] 1.2 Add a private admin-preview rendering path with loading/failure fallback and no storage key or credential in browser state; verify a focused component test for unpublished media and preview failure.

## 2. Media library

- [x] 2.1 Replace `/media` placeholder with an accessible list of validated metadata and opaque cursor pagination, including loading, empty, failure, active, deleting, and delete-failed states; verify route tests for each state and keyboard access.
- [x] 2.2 Implement permitted upload with size/format guidance, in-progress feedback, server validation errors, refresh after success, and recoverable failure; verify component/client tests for a valid image and rejected or interrupted upload.
- [x] 2.3 Implement confirmed deletion and retry of failed deletion, preserving remote state on errors and labelling accepted deletion as pending; verify tests for viewer restrictions, referenced-media refusal, accepted 202, and retry.

## 3. Editor reuse and browser flows

- [x] 3.1 Connect model and block media fields to the shared active-item library picker with opaque pagination, preview, upload, explicit selection/clear, and unresolved current-ID handling; verify editor tests for later-page reuse, confirmed upload, inaccessible ID, and unchanged draft on picker failure.
- [x] 3.2 Repair the Node/MinIO PutObject request so a validated bounded image uploads to real MinIO without a streaming-request 500; verify the adapter's byte count and the live upload response.
- [x] 3.3 Repair body-limit handling for bodyless media lifecycle requests while preserving limits on body-bearing requests; verify an API test and the live referenced-media deletion response.
- [x] 3.4 Exercise live browser flows for upload, preview, reuse in a field and block, keyboard operation, invalid upload, and deletion-failure recovery on the local stack; fix any concrete 15A failures and record the verification result.

## 4. Completion checks

- [x] 4.1 Run the narrowest relevant tests, root typecheck, Oxlint, Oxfmt check, and `pnpm exec openspec validate m15a-media-library-reuse --type change --strict`; resolve failures and confirm all 15A tasks are complete.

## Live verification

On 2026-09-25, an isolated local Node/Postgres/MinIO stack served the admin UI. An invalid image received a 422 validation error; a valid PNG uploaded successfully and rendered through the private preview. The image was selected in a model media field by keyboard and in a media block, then saved without a false unsaved-changes state. Deletion while referenced received `CONTENT_INVALID_STATE`; after clearing both references and saving, the repeated request returned `202` and the library displayed “Deletion pending.”
