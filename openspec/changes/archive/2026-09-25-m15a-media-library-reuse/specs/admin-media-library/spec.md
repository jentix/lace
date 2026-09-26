## Purpose

Defines the browser-admin media library for finding, uploading, previewing, reusing, and safely deleting private media through the authenticated API.

## ADDED Requirements

### Requirement: Authenticated users can browse and preview media
The `/media` route SHALL show validated media metadata in bounded pages and request subsequent pages using the server's opaque cursor. It SHALL distinguish loading, empty, and failed list states, and SHALL show each item's filename, type, size, and lifecycle status. It SHALL obtain image previews through the authenticated admin preview boundary, including for unpublished media, without exposing an object key, storage URL, or credential. A failed or unavailable preview SHALL leave the item's metadata and a visible fallback accessible.

#### Scenario: A library has another page
- **WHEN** an authenticated user loads media and the response has a next cursor
- **THEN** the user can request the next page and inspect its items without decoding the cursor

#### Scenario: An unpublished image is previewed
- **WHEN** an authenticated user opens a library item that is not referenced by published content
- **THEN** its image preview is read through the admin preview endpoint and no private storage location appears in the browser response

#### Scenario: Loading or preview fails
- **WHEN** a media page or image preview fails to load
- **THEN** the UI presents an accessible failure or fallback and does not portray it as an empty successful library

### Requirement: Permitted writers can upload verified media with recoverable feedback
The library SHALL offer upload only to roles allowed to write media, submit the file to the authenticated media API, and show upload progress or an explicit in-progress state. It SHALL identify the accepted size and image-format constraints before submission and present local or server validation failures without claiming success. A confirmed upload SHALL appear as an active item available for reuse; a failed upload SHALL leave the existing library usable and permit correction and retry. The API remains authoritative for binary validation and permission.

#### Scenario: An editor uploads an image
- **WHEN** an editor uploads a valid supported image and the API confirms creation
- **THEN** the library shows the uploaded active item, allows preview and reuse, and ends the upload progress state

#### Scenario: An upload is rejected
- **WHEN** a selected file is oversized, has an unsupported format, or the server rejects its bytes
- **THEN** an accessible error is shown, no successful item is added, and the user can select another file or retry

#### Scenario: A viewer opens the library
- **WHEN** a viewer browses the library
- **THEN** read and preview controls are available while upload and deletion controls are absent

### Requirement: Media deletion remains confirmed and recoverable
The library SHALL offer a writer a confirmed delete request for an active item and a retry action for an item in `delete_failed`. It SHALL label `deleting` as pending asynchronous removal, not completed deletion. It SHALL update the visible state only from validated API results, preserve the item and show a non-sensitive error when a request fails, and explain a rejected deletion of referenced media without suggesting the reference was removed. These controls SHALL be keyboard operable; API authorization and reference checks remain authoritative.

#### Scenario: An unreferenced item is queued for deletion
- **WHEN** a permitted writer confirms deletion and the API accepts the request
- **THEN** the item is shown as deleting until subsequent remote state confirms its removal

#### Scenario: A referenced item cannot be deleted
- **WHEN** the API refuses deletion because content references the item
- **THEN** the item remains in the library and the writer sees the failure without a success claim

#### Scenario: A failed deletion is retried
- **WHEN** a permitted writer retries a `delete_failed` item and the API accepts the request
- **THEN** the item returns to a pending deletion state without claiming the object has already been removed
