## Why

Roadmap Step 19 (Block editor), Session 19B. After 19A, the editor's layout,
header, and publication details are in place, but blocks still render as plain
cards with six text buttons in a wrapping header. A collapsed block shows only
its type, so several collapsed Hero blocks look the same. Nothing shows which
block is being edited. Long labels and the button row overlap at narrow widths.
New blocks can only be appended through a row of "Add <type>" buttons with no
explanation of what each block is for. Step 19's outcome needs an active block
that is obvious and collapsed blocks that stay recognizable.

This change follows architecture §11 (block registry: a stable key, a
human-readable label, and serializable form metadata) and §17 (admin
application, with dnd-kit for accessible block ordering). It modifies the
accepted `block-registry` and `admin-draft-editor` specs.

## What Changes

- **Built-in block display metadata.** The block DSL, the registry metadata
  projection, and the admin block-metadata contract already accept an optional
  `description` and carry it to the admin content-model read. This change
  closes the remaining gap: the five built-in blocks (`hero`, `richText`,
  `image`, `quote`, `cta`) gain a human-readable label and a one-sentence
  description. These are display metadata, so the structural hash does not
  change. Configuration synchronization classifies the result as a label-only
  update.
- **Block icons.** The admin maps each built-in block type to an icon and uses
  a default icon for any other block type. This mapping lives in the admin, not
  in configuration.
- **Block cards.** Each block renders as a card with the following parts:
  - A header row: a drag handle, the block icon, the block label, and a one-line
    summary taken from the block's data. The header row never overlaps. The
    label and the summary truncate, and the controls keep their size.
  - A collapse and expand toggle that reports its expanded state.
  - An actions menu with Move up, Move down, Duplicate, and Remove. Move up and
    Move down are unavailable at the ends of the list.
- **Active block.** The block being edited is highlighted. A block becomes
  active when focus or a pointer enters it. A newly added or duplicated block
  becomes active, expanded, and focused.
- **Remove with undo.** Removing a block leaves an inline notice at its place,
  and focus moves to that notice's Undo action. Undo restores the same block,
  with the same key and data, at the same position. The notice goes away on the
  next structural block action or when the writer dismisses it.
- **Insert between blocks and an Add block menu.** An insert control sits
  between adjacent blocks. An Add block button follows the list. Both open the
  same Add block menu:
  - It lists only the model's allowed blocks, each with its icon, label, and
    description.
  - It has a text filter and a no-match state.
  - Choosing a block inserts it at the chosen position.
  The row of "Add <type>" buttons is removed. **Breaking** for tests that click
  "Add <type>" or the inline Move, Duplicate, Collapse, and Remove buttons.
- **Errors stay visible.** A block with a validation error always renders
  expanded, so its field error stays visible.
- **Reordering is unchanged.** Keyboard and pointer drag reordering through
  dnd-kit still update one shared visible order. Stable keys, sparse local
  positions, and one revision per Save are unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `block-registry`: the starter-block requirement adds that each built-in block
  carries a human-readable label and description. A scenario adds that
  description stays out of the structural identity.
- `admin-draft-editor`: the block-authoring requirement is revised. It now
  covers block cards with icon, label, and data summary; collapse; the active
  block highlight; the actions menu; remove with undo; the insert control; the
  filterable Add block menu with descriptions; and errors that keep a block
  expanded.

## Impact

- `packages/content`: `builtInBlocks` gains labels and descriptions, and the
  content tests change with it.
- `packages/config`: the tests assert that built-in display metadata changes
  the projection hash but not the structure hash.
- `apps/admin`:
  - `widgets/block-editor` is rebuilt. It gets the internal components
    `BlockCard`, `AddBlockMenu`, and `RemovedBlockNotice`, and the internal
    modules `block-presentation.ts` (icons and summaries).
  - Unit tests that add blocks or use the inline block buttons change:
    `BlockEditor`, `EntryPage`, and `MediaPicker`.
  - The e2e specs `editor.e2e.ts` and `acceptance.e2e.ts` change in the same
    way.
- No REST route, OpenAPI document, database, SDK, or dependency change. The
  admin content-model read already carries block `label` and `description`.
  Existing local databases need a label-only `lace sync` to record the new
  projection hash.
- Dependencies on accepted work:
  - 16B primitives: DropdownMenu, Popover, Button, and Input.
  - 19A editor layout and read-only fieldset.
  - 18C media fields inside blocks.
- Non-goals:
  - The rich-text toolbar, shortcuts, and placeholders (19C).
  - The validation summary and links to the first invalid block (19C).
  - Configurable block icons.
  - Nested blocks.
  - Block-local migrations.
  - Multi-select.
  - An undo history beyond the most recent removal.
