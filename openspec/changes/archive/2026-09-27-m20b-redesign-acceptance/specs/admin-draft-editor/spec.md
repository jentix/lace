## MODIFIED Requirements

### Requirement: The editor layout keeps actions and entry details at hand
The entry editor SHALL place its save-state indicator, its single Save action, and, for administrators, its Publish action in the shell header beside the breadcrumbs, so they stay visible while the editor scrolls. The save-state indicator SHALL distinguish unsaved changes, saving, a failed save with local changes kept, the saved revision, and view-only access in text. Save SHALL be available through the platform save shortcut (`⌘S` on Apple platforms, `Ctrl+S` elsewhere), which the Save control SHALL advertise visibly and programmatically. While the editor is mounted, the shortcut SHALL NOT open the browser's page-save behavior. The shortcut SHALL submit exactly like the Save control and SHALL do nothing when the draft is clean, a save is in progress, or the user cannot save. The title SHALL be presented as a prominent input with an accessible "Title" label. At wide viewports the editor SHALL show the title and blocks in a main column and the publication details and entry fields (collection slug and model fields) in a right-hand column. At narrow viewports that column SHALL follow the blocks in reading and keyboard order.

#### Scenario: A writer saves with the keyboard
- **WHEN** a writer changes the title and presses `Ctrl+S` (or `⌘S` on an Apple platform)
- **THEN** exactly one complete-draft request is sent, the browser does not open its save-page dialog, and the indicator changes from unsaved changes to saving to the saved revision

#### Scenario: The shortcut is pressed on a clean draft
- **WHEN** a writer presses the save shortcut without having changed the loaded draft
- **THEN** no draft-save request is sent and the browser's page-save behavior is still suppressed

#### Scenario: Header actions stay visible
- **WHEN** a writer scrolls a long entry
- **THEN** the breadcrumbs, the save-state indicator, Save, and (for admins) Publish remain visible in the header

#### Scenario: Entry fields sit in the right-hand column
- **WHEN** a collection entry with model fields is opened at a wide viewport
- **THEN** the title and blocks appear in the main column and the publication details, slug, and model fields appear in the right-hand column

#### Scenario: The entry column stacks on a narrow screen
- **WHEN** a collection entry with model fields is opened at a 375px-wide viewport
- **THEN** the publication details and entry fields appear below the last block, keyboard focus reaches them after the block controls, and the page does not scroll horizontally
