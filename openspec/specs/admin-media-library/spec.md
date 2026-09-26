# admin-media-library Specification

## Purpose

Defines the browser-admin media library for finding, uploading, previewing, reusing, and safely deleting private media through the authenticated API.

## Requirements

### Requirement: Authenticated users can browse and preview media
The `/media` route SHALL show validated media metadata in bounded pages and request subsequent pages using the server's opaque cursor. It SHALL distinguish loading, empty, no-match, and failed list states. It SHALL present items either as a grid of image tiles or as a list, and each item SHALL show its filename and a status indication when it is not active; the list view SHALL additionally show type, dimensions when known, size, uploader display name, upload date, and usage count. It SHALL obtain image previews through the authenticated admin preview boundary, including for unpublished media, without exposing an object key, storage URL, or credential, and SHALL defer loading a preview until its tile or row approaches the viewport. A failed or unavailable preview SHALL leave the item's metadata and a visible fallback accessible. No library surface SHALL show a raw user ID.

#### Scenario: A library has another page
- **WHEN** an authenticated user loads media and the response has a next cursor
- **THEN** the user can request the next page and inspect its items without decoding the cursor

#### Scenario: An unpublished image is previewed
- **WHEN** an authenticated user opens a library item that is not referenced by published content
- **THEN** its image preview is read through the admin preview endpoint and no private storage location appears in the browser response

#### Scenario: Loading or preview fails
- **WHEN** a media page or image preview fails to load
- **THEN** the UI presents an accessible failure or fallback and does not portray it as an empty successful library

#### Scenario: Previews load lazily
- **WHEN** the library renders a page of tiles
- **THEN** each preview image is requested with deferred loading rather than eagerly for off-screen tiles

#### Scenario: The list view shows item facts
- **WHEN** a user switches to the list view
- **THEN** each row shows a thumbnail, filename, type, dimensions or an unknown marker, size, uploader display name, upload date, and usage count

### Requirement: Permitted writers can upload verified media with recoverable feedback
The library SHALL offer upload only to roles allowed to write media. A writer SHALL be able to choose several files at once and SHALL be able to drop files anywhere over the library; the drop target SHALL be visibly indicated while files are dragged over it. The library SHALL identify the accepted size and image-format constraints before submission and SHALL check each file's type and size in the browser before sending it, reporting a local rejection for that file without sending it. Each accepted file SHALL be uploaded to the authenticated media API with its own visible state: queued, uploading with byte progress when the browser reports it, uploaded, or failed with the non-sensitive server error for that file. One file's failure SHALL NOT prevent or undo the other files' uploads. A server-rejected or network-failed file SHALL offer retry; a locally rejected file SHALL require choosing another file. Confirmed uploads SHALL appear as active items in the library without a manual refresh. The API remains authoritative for binary validation and permission.

#### Scenario: An editor uploads an image
- **WHEN** an editor uploads a valid supported image and the API confirms creation
- **THEN** the library shows the uploaded active item, allows preview and reuse, and ends the upload progress state

#### Scenario: An upload is rejected
- **WHEN** a selected file is oversized, has an unsupported format, or the server rejects its bytes
- **THEN** an accessible error is shown for that file, no successful item is added for it, and the user can select another file or retry

#### Scenario: Several files are dropped with mixed results
- **WHEN** an editor drops three files: a valid PNG, a PDF, and a valid JPEG that the server rejects
- **THEN** the PNG is uploaded and reported as uploaded, the PDF is reported as an unsupported type without any request being sent for it, and the JPEG is reported with the server's error and a retry action

#### Scenario: Upload progress is reported per file
- **WHEN** an upload reports that half of a file's bytes have been sent
- **THEN** that file's row shows 50% progress while other files keep their own states

#### Scenario: A viewer opens the library
- **WHEN** a viewer browses the library
- **THEN** read and preview controls are available while upload, drop-zone, and deletion controls are absent

### Requirement: Media deletion remains confirmed and recoverable
The library SHALL offer a writer deletion of an active item from its details panel only after an explicit confirmation dialog, and a retry action for an item in `delete_failed`. It SHALL label `deleting` as pending asynchronous removal, not completed deletion. When the item's usage count is greater than zero, the deletion action SHALL be unavailable and the panel SHALL explain that the item must first be removed from the listed entries and those entries published. It SHALL update the visible state only from validated API results, preserve the item and show a non-sensitive error when a request fails, and explain a rejected deletion of referenced media without suggesting the reference was removed. These controls SHALL be keyboard operable and SHALL return focus predictably when the confirmation closes; API authorization and reference checks remain authoritative.

#### Scenario: An unreferenced item is queued for deletion
- **WHEN** a permitted writer confirms deletion and the API accepts the request
- **THEN** the item is shown as deleting until subsequent remote state confirms its removal

#### Scenario: Deletion is cancelled
- **WHEN** a writer opens the deletion confirmation and cancels it
- **THEN** no deletion request is sent and focus returns to the delete action

#### Scenario: A referenced item cannot be deleted
- **WHEN** the API refuses deletion because content references the item
- **THEN** the item remains in the library and the writer sees the failure without a success claim

#### Scenario: A used item offers guidance instead of deletion
- **WHEN** a writer opens the details of an item whose usage count is 2
- **THEN** the delete action is unavailable and the panel explains that the item must be removed from the listed entries and those entries published first

#### Scenario: A failed deletion is retried
- **WHEN** a permitted writer retries a `delete_failed` item and the API accepts the request
- **THEN** the item returns to a pending deletion state without claiming the object has already been removed

### Requirement: Library search, type filter, sort, and view are URL state
The `/media` route SHALL keep its filename search term, type filter, sort order, and grid or list view in the route's URL search parameters and SHALL request media from the API with exactly the search, type, and sort values. Opening or reloading a library URL with these parameters SHALL restore the same search box contents, type filter, sort order, view, and results. Unsupported type, sort, or view values, and search terms that are blank or longer than the API accepts, SHALL be ignored rather than causing an error, and default values (no search, all types, newest first, grid view) SHALL not be written to the URL. Search input SHALL update the URL after the user pauses typing without adding a history entry per keystroke. Changing the search, type, or sort SHALL restart pagination at the first page; pagination cursors SHALL never be written to the URL. A filtered library with no results SHALL offer to clear the filters instead of claiming the library is empty.

#### Scenario: A filtered library survives a reload
- **WHEN** an editor searches for "hero", selects the PNG filter, sorts by name, switches to the list view, and reloads the page
- **THEN** the URL carries `q=hero`, `type=image/png`, `sort=filename`, and `view=list`, and after the reload the controls and list view are restored and the API is queried with the same search, type, and sort

#### Scenario: Unsupported parameters are ignored
- **WHEN** a user opens `/media?type=image/gif&sort=author&view=cards`
- **THEN** the library loads unfiltered, newest first, in the grid view, without an error

#### Scenario: Changing a filter restarts pagination
- **WHEN** a user has loaded a second page and then changes the type filter
- **THEN** media is requested without a cursor and the first page of the new filter is shown

#### Scenario: No media matches the filters
- **WHEN** the search "zzz" returns no items
- **THEN** the library states that no media matches and offers a control that clears the search and type filter

### Requirement: A details panel describes one media item
Activating a tile or list row SHALL open a details panel for that item, labelled by its filename, that SHALL show a larger preview through the admin preview boundary, type, dimensions or an unknown marker, human-readable size, uploader display name, upload date, and lifecycle status. The panel SHALL load the item's usage from the API and SHALL list each using entry by title with a link to its editor, its content model, its entry status, and each location as an entry field or a block field together with whether the draft, the published version, or both use it. When the API returns fewer entries than the usage count, the panel SHALL say that more entries use the item than are shown. It SHALL distinguish usage loading and failure from "not used". The panel SHALL offer copying the item's public media URL and SHALL explain that the public URL serves the file only once published content uses it; it SHALL confirm a successful copy and report a failed copy. The panel SHALL be keyboard operable, SHALL trap focus while open, SHALL close on Escape, and SHALL return focus to the tile or row that opened it.

#### Scenario: A used image is inspected
- **WHEN** an editor opens the details of an image used in the draft of entry "Launch" through the hero block's image field
- **THEN** the panel lists "Launch" with a link to its editor and a block location for the hero image field marked as used by the draft

#### Scenario: Usage is truncated
- **WHEN** the item's usage count is 60 and the API returns 50 using entries
- **THEN** the panel lists the 50 entries and states that more entries use the item than are shown

#### Scenario: Usage fails to load
- **WHEN** the usage request fails
- **THEN** the panel shows an accessible error for usage and does not claim the item is unused

#### Scenario: The public URL is copied
- **WHEN** a user activates copy URL and the clipboard accepts the text
- **THEN** the item's public media URL is copied and a confirmation is announced

#### Scenario: The panel closes from the keyboard
- **WHEN** a keyboard user opens the details of a tile and presses Escape
- **THEN** the panel closes and focus returns to that tile
