## MODIFIED Requirements

### Requirement: Generic block media fields use the existing media surface
Generic block fields SHALL render from their validated portable metadata. A model or block media field SHALL choose its stored media identifier through the shared media picker dialog, which browses active items across opaque cursor pages with the library's thumbnails, filename search, type filter, and sort, and SHALL let permitted writers upload within that dialog and choose a confirmed upload. The picker SHALL expose labelled loading, empty, no-match, upload-progress, validation-failure, and list-failure states without silently changing the draft; choosing an item SHALL change only that field's value and SHALL NOT save the draft. A field with a value SHALL show the selected item as a thumbnail read through the admin preview boundary together with its filename and offer Replace, which reopens the picker, and Remove, which clears the value. The field SHALL resolve its value through an authorized single-item media read rather than by searching loaded list pages, SHALL label the resolving state, and SHALL NOT infer that an item is missing merely because it is outside a loaded page. When the value is pending deletion, has failed deletion, no longer exists, or cannot be read, the field SHALL show a distinct accessible state for that condition, SHALL retain the identifier in the draft until the writer replaces or removes it, and SHALL offer retry when the read failed for another reason than absence. No media field state SHALL display the raw media identifier. The editor SHALL associate server validation issues at model-field, block-data, rich-text, or URL paths with the matching visible control while preserving the writer's complete local draft.

#### Scenario: A writer selects media for a block
- **WHEN** the media list loads and a writer opens the picker for a block media field and activates an active item's tile
- **THEN** the dialog closes, the block field shows that item's thumbnail and filename, and the next complete-draft save includes that media identifier

#### Scenario: A writer reuses media from a later page
- **WHEN** the desired active media item is beyond the first list page of the picker
- **THEN** the writer can request subsequent pages and choose it without leaving the editor or changing other draft values

#### Scenario: A writer searches the picker
- **WHEN** a writer types "hero" into the picker's search and selects the PNG filter
- **THEN** the picker requests media with that search and type, shows only the matching active items, and the editor route's URL does not change

#### Scenario: A writer uploads from the picker
- **WHEN** a permitted writer uploads a valid image from a field or block picker
- **THEN** the confirmed active item becomes choosable in that picker and its identifier enters the draft only when the writer chooses it

#### Scenario: Several files are uploaded from the picker with mixed results
- **WHEN** a writer uploads a valid PNG and a file the server rejects from a block picker
- **THEN** the PNG is reported as uploaded and can be chosen, the rejected file is reported with the server's error and a retry action, and the draft is unchanged until a choice is made

#### Scenario: A writer replaces and removes a selection
- **WHEN** a writer activates Replace on a selected field, chooses another item, and later activates Remove
- **THEN** the field first shows the newly chosen item and then shows that no media is selected, and neither action saves the draft

#### Scenario: A current selection no longer exists
- **WHEN** a saved media identifier's single-item read reports that the item was not found
- **THEN** the editor retains the identifier, states that the selected media no longer exists without showing the identifier, and allows explicit replacement or removal without silently mutating the draft

#### Scenario: A current selection is pending deletion
- **WHEN** a saved media identifier resolves to an item whose status is `deleting` or `delete_failed`
- **THEN** the field shows the item's filename with an accessible unavailable state for that status and offers Replace and Remove

#### Scenario: A current selection is inaccessible
- **WHEN** a saved media identifier's single-item read fails for a reason other than absence
- **THEN** the editor retains the identifier, presents an accessible could-not-load message with a retry action, and allows explicit replacement or removal

#### Scenario: Block validation fails on save
- **WHEN** the server rejects a block data field, rich-text value, or URL with a documented JSON Pointer issue
- **THEN** the editor preserves the local ordered block list and attaches an accessible error to the corresponding model or block field
