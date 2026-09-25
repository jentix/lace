## MODIFIED Requirements

### Requirement: Generic block media fields use the existing media surface
Generic block fields SHALL render from their validated portable metadata. A model or block media field SHALL use the shared authenticated library selection surface to browse active items across opaque cursor pages, inspect private previews, and choose an existing item as its stored media identifier. Permitted writers SHALL be able to upload within that selection flow and select a confirmed upload. The picker SHALL expose labelled loading, empty, upload-progress, validation-failure, and list-failure states without silently changing the draft. When an existing media identifier is absent from the browsed page, deleted, or inaccessible, the editor SHALL retain that identifier and show an explicit unresolved-selection state until the writer chooses a replacement or clears the value. It SHALL NOT infer that an item is missing merely because it is outside the currently loaded page. The editor SHALL associate server validation issues at model-field, block-data, rich-text, or URL paths with the matching visible control while preserving the writer's complete local draft.

#### Scenario: A writer selects media for a block
- **WHEN** the media list loads and a writer selects an active item for a block media field
- **THEN** the generic block form displays the selection and includes that media identifier in the next complete-draft save

#### Scenario: A writer reuses media from a later page
- **WHEN** the desired active media item is beyond the first list page
- **THEN** the writer can request subsequent pages and select it without leaving the editor or changing other draft values

#### Scenario: A writer uploads from the picker
- **WHEN** a permitted writer uploads a valid image from a field or block picker
- **THEN** the confirmed active item becomes selectable in that picker and its identifier enters the draft only when selected

#### Scenario: A current selection is inaccessible
- **WHEN** a saved media identifier cannot be resolved through an authorized read or the API establishes that it is unavailable
- **THEN** the editor retains the identifier, presents an accessible unresolved-selection message, and allows explicit replacement or clearing without silently mutating the draft

#### Scenario: Block validation fails on save
- **WHEN** the server rejects a block data field, rich-text value, or URL with a documented JSON Pointer issue
- **THEN** the editor preserves the local ordered block list and attaches an accessible error to the corresponding model or block field
