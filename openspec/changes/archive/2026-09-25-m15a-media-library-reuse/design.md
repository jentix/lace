## Context

See `proposal.md` for motivation and the two delta specs for behavior. `apps/admin/src/app.tsx` currently renders a `/media` placeholder and an editor picker that queries only the first page. `apps/admin/src/admin-client.ts` validates the media list but has no upload, delete, retry, or preview helper. The API already has bounded list, multipart upload, deletion request, retry, and authenticated preview routes; shared contracts validate the metadata. The API enforces roles, binary format and size, media-reference checks, and asynchronous object deletion.

## Goals / Non-Goals

**Goals:** Reuse one media browsing and upload surface in the library and editor; keep server-confirmed remote state separate from the unsaved draft; preserve private preview access and expose recoverable failures.

**Non-Goals:** New API routes, database or object-store migrations, client-side binary security decisions, background deletion dispatch changes, or persistent media URLs.

## Decisions

1. **One browser media surface.** Build a shared browser component or hook in `apps/admin` for cursor pages, active-item choices, preview, and upload. The `/media` route adds lifecycle actions while the editor uses selection mode. Reusing it avoids divergent first-page handling; separate route-specific controls keep delete actions out of the picker.
2. **Validated API client operations.** Add typed upload, delete-request, and retry methods to `AdminClient`, parsing the existing metadata schema and using same-origin credentials. Use multipart `file` for upload and preserve the shared error-envelope mapping. A preview must use `/api/v1/admin/media/:id/preview` with session credentials. A raw object URL based on the public endpoint would fail for unpublished items; a direct `<img>` to the same-origin admin endpoint may render the authenticated response without reading it into application state. If an explicit fetch is needed for reliable failure handling, release generated blob URLs when no longer displayed.
3. **Opaque pagination and cache refresh.** Treat `nextCursor` as an opaque value. Use existing TanStack Query keys or an infinite query for pages; on successful mutation, invalidate media pages and show the validated mutation result immediately. Keep the selected ID in editor form state, changing it only on an explicit selection or clear action. Resolve an existing ID only from a definitive response or after all pages have been traversed; a miss on page one is not proof of deletion.
4. **Progress and failure.** The existing fetch-based client can provide an explicit pending upload state. If measurable byte progress is exposed, use a credentialed transport with the same error parser and cancellation semantics. Never fabricate a percentage from an indeterminate fetch. Client checks improve feedback for unsupported types and files larger than 10 MiB; the server's byte-level verification remains final. Failed mutations preserve the current list and selection. Deletion prompts for confirmation, and accepted `deleting` is labelled as queued work.
5. **Node/MinIO upload compatibility.** The live-stack attempt to write a valid PNG returned 500 with an S3 SDK non-retryable streaming-request error. The Node adapter currently submits an unbounded `Readable` as a `PutObjectCommand` body with no `ContentLength`. The media use case already collected and verified the bounded image bytes. Supply a known byte length when uploading or use a bounded byte buffer, while keeping the storage-port byte count accurate and memory bounded by the existing 10 MiB upload limit. Keep failure sanitization and cleanup behavior. This is an existing adapter defect, not a new API contract; test through real MinIO as well as the adapter unit path. The alternative, adding a new upload protocol or changing the portable storage port, would widen Session 15A without solving the immediate SDK request-shape problem.
6. **Bodyless lifecycle requests.** The live browser's `DELETE /api/v1/admin/media/:id` reached Hono's body-limit middleware with an empty Node request stream but no length headers; the middleware tried to reconstruct a Request and failed before route handling. For requests without length or transfer headers, read a clone to enforce the configured size limit without reconstructing the original request; an empty stream proceeds unchanged. Keep the existing limit path for requests with declared bodies. This repairs the existing transport without changing media use cases or permission rules; verify bodyless deletion and retry as well as a body-bearing oversized request.
7. **Role boundaries.** Read and preview work for all authenticated roles. The UI hides mutations for viewers, while each API operation still enforces `media:write`. No response or browser state stores object keys, bucket details, or credentials. This design applies to Node/MinIO and Cloudflare/R2 through the same REST boundary.

## Risks / Trade-offs

- [Long media lists make resolving a saved ID expensive] → Keep the saved ID visible as unresolved while paging, and declare it inaccessible only after an authoritative missing response or exhausted pages; do not request every page merely to mount the editor.
- [An image preview request can fail after metadata succeeds] → Preserve metadata, render an accessible fallback, and permit retry without changing draft state.
- [Deletion may complete later or fail] → Render the returned status and refresh remote data; never remove an item optimistically after a 202 response.
- [Network loss during upload leaves an uncertain outcome] → Refresh the list after recovery and let the writer select a confirmed item; do not auto-retry a multipart upload or claim success.
- [S3 SDK rejects a stream without a known length] → Send the already bounded body with a known content length or as a bounded byte buffer, and confirm the live MinIO upload before accepting 15A.
- [Body-limit middleware reconstructs a bodyless Node request] → Bypass it only for requests with no declared or streamed body, then assert the media lifecycle route returns its domain result instead of a transport 500.

## Migration Plan

No schema or API migration. Deploy the admin bundle against the existing API. Rollback restores the prior admin bundle; media uploaded or deletion requested during the new flow remains governed by the existing server lifecycle.
