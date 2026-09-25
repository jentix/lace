## Why

Step 15, Session 15A replaces the browser admin's Media placeholder and first-page-only editor picker. Writers need to upload an image once, find and reuse it in fields or blocks, and recover from upload and deletion failures without leaving the admin UI. This advances the architecture's browser-managed media goal (§2), private object boundary (§4.6), and authenticated preview boundary (§11, Media URLs and admin endpoints).

## What Changes

- Add a `/media` library for authenticated browsing, private preview, opaque cursor pagination, and writer-only upload and deletion controls. Show deletion state and allow a permitted retry for `delete_failed` items.
- Make the field and block media picker share the library's active-item browsing and upload flow, including multiple pages, selection state, an empty state, progress, validation failures, and a missing or inaccessible current selection.
- Verify keyboard operation and live browser flows for upload, reuse, rejected input, and recovery. Use the existing authenticated media API and keep storage keys and credentials off browser responses.

## Capabilities

### New Capabilities

- `admin-media-library`: Browser media browsing, upload, preview, pagination, and recoverable lifecycle actions.

### Modified Capabilities

- `admin-draft-editor`: Media field and block selection gains shared library browsing, upload, pagination, and explicit inaccessible-selection handling.

## Impact

- Affects `apps/admin` routes, API client, editor picker, UI styles, and browser tests. Reuses the existing `/api/v1/admin/media` list/upload/delete/retry and authenticated preview endpoints, plus existing shared media DTOs and validation envelopes. Live-stack checks revealed a Node/MinIO stream-write failure and a body-limit failure on bodyless media deletion; the scope includes repairing these existing server paths and verifying them against the local stack.
- Depends on the accepted `media-use-cases`, `rest-contracts`, `admin-application-shell`, `admin-remote-state-and-lists`, and `admin-draft-editor` specs. The API remains authoritative for `content:read`, `media:write`, validation, reference checks, and asynchronous deletion.
- Scope is Session 15A only. Users, Settings, and full local acceptance belong to Sessions 15B/15C; Builds belongs to Step 16. No new storage transport, media type, permission, or public-media visibility rule is proposed.
