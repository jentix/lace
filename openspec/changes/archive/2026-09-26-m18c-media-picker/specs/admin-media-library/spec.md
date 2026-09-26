## ADDED Requirements

### Requirement: The media picker dialog reuses the library
The admin SHALL offer media selection as a modal dialog labelled by the field it chooses for. The dialog SHALL present active media as the library's image tiles, loaded lazily through the authenticated admin preview boundary, with the library's filename search, type filter, sort, and cursor pagination, and SHALL distinguish loading, empty, no-match, and failed list states. Its search, type filter, and sort SHALL be local to the dialog: they SHALL NOT be written to the URL, SHALL NOT change the `/media` route's state, and SHALL reset to their defaults each time the dialog opens. Items pending or failing deletion SHALL NOT be offered as choices. The dialog SHALL indicate which tile is the field's current selection. Activating a tile SHALL choose that item and close the dialog. For roles allowed to write media, the dialog SHALL accept dropped files and a multi-file "Upload images" picker with the library's per-file type and size checks, progress, server errors, and retry; each confirmed upload SHALL offer to be chosen directly from its upload row, and SHALL appear in the grid when it matches the current filters. Uploading SHALL NOT choose an item. The dialog SHALL be keyboard operable, SHALL trap focus while open, SHALL close without changing the value on Escape or its close control, and SHALL return focus to the field control that remains after closing.

#### Scenario: A keyboard user chooses media
- **WHEN** a keyboard user opens the picker from a media field, moves to a tile, and presses Enter
- **THEN** the dialog closes, the field holds that item, and focus is on the field's Replace action

#### Scenario: The picker is dismissed
- **WHEN** a user opens the picker and presses Escape
- **THEN** the dialog closes, the field value is unchanged, and focus returns to the control that opened it

#### Scenario: Picker filters are local
- **WHEN** a user filters the picker to PNG images, closes it, and opens it again
- **THEN** the URL never carried the filter and the reopened picker shows all types, newest first

#### Scenario: An uploaded item is chosen from its upload row
- **WHEN** a writer uploads "fresh.png" in a picker filtered to JPEG images and activates the upload row's use action
- **THEN** the dialog closes and the field holds the uploaded item even though the grid did not show it

#### Scenario: A viewer opens the picker
- **WHEN** a viewer opens a media picker
- **THEN** active items can be browsed and previewed while upload and drop-zone controls are absent

#### Scenario: Items pending deletion are not offered
- **WHEN** a picker page contains an active item and an item whose status is `deleting`
- **THEN** only the active item is shown as a choice
