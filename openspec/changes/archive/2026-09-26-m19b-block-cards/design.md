## Context

`widgets/block-editor/BlockEditor` is a single 230-line module. It holds
`useFieldArray` over `blocks`, a dnd-kit `DndContext` and `SortableContext`, a
row of "Add <label>" buttons, and `SortableBlockCard`. Each card's header is a
wrapping flex row with an `h2` label and six text buttons: Drag, Move up, Move
down, Duplicate, Collapse or Expand, and Remove. Collapsed state is a
`Set<key>`. Cards whose type has no definition render nothing.

Facts the design relies on:

- `defineBlock`, `toBlockMetadata`, and the contracts `isBlockMetadata` already
  accept and project an optional `description`. The admin content-model read
  carries `blockDefinitions[].label` and `blockDefinitions[].description`, and
  OpenAPI types the array items loosely. No contract change is needed. None of
  the `builtInBlocks` sets a label or description.
- `omitDisplayMetadata` removes every `label` and `description` key before
  hashing the structure. Built-in display metadata therefore changes only the
  projection hash, and sync plans that as a label-only update.
- Order is the array order of the submitted blocks. `move` never rewrites
  `position`, and new blocks use `max + 1024`.
- `EntryPage` puts the editor in `<fieldset disabled={readOnly}
  className="contents">`, so every native button inside, including Radix
  triggers, is disabled for viewers.
- The admin test harness does not mount the Sonner `Toaster`.
- The boundary check requires each `.tsx` module to be `<Folder>/<Folder>.tsx`
  with a test and an `index.ts`. A slice's plain `.ts` modules may sit at the
  slice root.

## Goals / Non-Goals

**Goals:**

- Cards that read clearly when collapsed and never overlap.
- One block interaction model (menu, insert, undo) that 19C can extend with
  error markers without restructuring.
- Keep block keys, positions, and save behavior unchanged.

**Non-Goals:**

- Changing how blocks are stored, their positions, or their validation.
- A virtualized list.
- Animation beyond dnd-kit's existing transforms.

## Decisions

### D1 — Built-in display metadata in `packages/content`

`builtInBlocks` gains a `label` and a `description` for each block:

| type | label | description |
|---|---|---|
| `hero` | Hero | Large heading with optional text, image, and action. |
| `richText` | Rich text | Formatted text with headings, lists, and links. |
| `image` | Image | A single image with alt text and an optional caption. |
| `quote` | Quote | A quotation with optional attribution. |
| `cta` | Call to action | A heading and a link that prompts the reader to act. |

The content test asserts that each built-in has a label and a description and
that both appear in `toBlockMetadata`. The config test builds two configs that
differ only in a block description. It asserts that their `projectionHash`
values differ and their `structureHash` values match.

*Rejected:* icons in block metadata. An icon name would become part of the
portable config contract, and the roadmap assigns icons to the admin.

### D2 — Presentation helpers (`widgets/block-editor/block-presentation.ts`)

- `blockIcon(type): LucideIcon` maps the built-in types to icons:

  | type | icon |
  |---|---|
  | `hero` | `PanelTop` |
  | `richText` | `Pilcrow` |
  | `image` | `Image` |
  | `quote` | `Quote` |
  | `cta` | `MousePointerClick` |
  | any other type | `Box` |

- `blockLabel(definition)` returns `definition.label ?? fieldLabel(type)`.
- `blockSummary(definition, data): string` checks candidates in this order and
  returns the first that is non-empty:

  1. Text and textarea values, with the keys `title`, `heading`, `name`,
     `quote`, `caption`, and `alt` first in that order, then the remaining
     keys in definition order.
  2. The plain text of the first non-empty rich-text value, taken with a
     recursive walk over `text` nodes that joins blocks with spaces.
  3. A non-empty URL or select value.
  4. `Media selected` when a media field has a value.
  5. `Empty block`.

  Whitespace collapses. The summary is capped at 120 characters with `…`, and
  CSS `truncate` handles narrower widths. Media IDs are never used as text.

- `matchesBlockFilter(definition, query)` is a case-insensitive substring
  match over label, type, and description.

These helpers are pure functions and get their own `block-presentation.test.ts`.

### D3 — Component split inside the widget slice

The widget gets these components:

- **`BlockEditor`**: owns the field array, dnd context, active key, collapsed
  set, pending removal, and focus requests.
- **`BlockCard`**: renders one sortable card.
- **`AddBlockMenu`**: a Popover with a filter input and the list of options.
  It is used for the insert slots and for the final Add block control.
- **`RemovedBlockNotice`**: the inline undo row.

Each component has its own folder, test, and `index.ts`. The slice's public
API stays `BlockEditor`.

### D4 — Card structure

```text
<article aria-labelledby=title-id data-active tabIndex=-1 ref=setNodeRef>
  <header class="flex items-center gap-2 min-w-0">
    [grip button: "Reorder <Label> block", dnd attributes + listeners]
    [icon aria-hidden]
    <div class="min-w-0 flex-1">
      <h3 id=title-id class="truncate">Label</h3>
      <p class="truncate text-muted-foreground">summary</p>
    </div>
    [chevron button: aria-expanded, aria-controls=fields-id, "Collapse <Label> block" / "Expand <Label> block"]
    [DropdownMenu trigger (MoreHorizontal): "Actions for <Label> block"]
  </header>
  <div id=fields-id hidden={collapsed}> FieldRenderer… </div>
</article>
```

- The heading level becomes `h3`, under the "Blocks" `h2`.
- `data-active="true"` styles the card with `border-primary ring-2 ring-ring/30`.
  Other cards use the plain card border.
- `onFocusCapture` and `onPointerDownCapture` report the card key to
  `BlockEditor` as the active key.
- Fields stay mounted when collapsed and use the `hidden` attribute. This keeps
  the controlled Tiptap editors and the media resolution alive, so a collapse
  loses no editor state. The previous code unmounted them. The form state is
  the same either way.
- The effective collapsed state is `collapsed && !hasError`. `hasError` is
  true when `errors[index]` has any entry. When a block has an error, the
  toggle is hidden and the card shows its fields.
- Menu items are Move up (disabled at index 0), Move down (disabled at the
  last index), Duplicate, a separator, and Remove (destructive variant).

### D5 — Actions, focus, and undo

`BlockEditor` state:

- `activeKey: string | undefined`
- `collapsed: Set<string>`
- `removed: { block, index, label } | undefined`
- `focusKey: string | undefined`

A `useEffect` on `focusKey` does the following once the card for that key
exists:

1. Focuses the card's `article`, which has `tabIndex={-1}`.
2. Calls `scrollIntoView({ block: "nearest" })`.
3. Clears `focusKey`.

Every structural action first clears `removed`, which makes an earlier removal
final:

| Action | Effect |
|---|---|
| insert at `index` | `insert(index, newBlock(definition))`, where the position is `max + 1024` as today. Sets `activeKey` and `focusKey` to the new key and removes that key from `collapsed`. |
| duplicate `index` | `insert(index + 1, clone with ulid())`. Sets active and focus as above. The previous code appended duplicates at the end, so the copy now appears directly after its source. |
| move | `move(from, to)` from the menu or from the dnd `onDragEnd`. Focus stays with Radix's return to the trigger, which moves with its card because the field ID is stable. |
| remove `index` | Saves `{ block without formId, index, label }` in `removed`, calls `remove(index)`, and then focuses the notice's Undo button on the next render. |
| undo | `insert(min(removed.index, fields.length), removed.block)` keeps the key and the data. Clears `removed` and focuses the restored card. |
| dismiss | Clears `removed` and focuses the Add block trigger. |

The `DndContext` gets custom `accessibility.announcements`. The pick-up,
move-over, drop, and cancel messages name the block by label and by position,
for example "Quote block moved to position 1 of 3." The dnd-kit defaults
announce the raw block keys.

`RemovedBlockNotice` renders `role="status"` with the text "Removed <Label>
block." and the buttons "Undo" and "Dismiss". It renders among the cards
before the card now at `removed.index`, or after the last card.

*Rejected:* a Sonner toast with Undo. The test harness has no Toaster, and a
toast is hard to reach by keyboard. Focus would have to jump into a portal
region that disappears on a timer.

### D6 — Add block menu

`AddBlockMenu({ definitions, onChoose, trigger })` uses `Popover`.
`PopoverContent` has `aria-label="Add block"`, so it exposes a named dialog.

- The content has an `Input type="search"` labelled "Filter blocks", which
  gets focus on open, and a `<ul>` of option buttons.
- Each option button has an icon, a label span, and a description span. It
  carries `aria-labelledby` pointing to the label and `aria-describedby`
  pointing to the description, so its name is the label alone.
- ArrowDown in the filter moves focus to the first option.
- ArrowUp and ArrowDown move between options, and ArrowUp on the first option
  returns to the filter.
- Enter in the filter chooses the only remaining match when exactly one
  remains.
- Filtered-out options are not rendered. With no match, the list is replaced
  by `role="status"` text "No blocks match “<query>”."
- Choosing an option calls `onChoose(definition)` and closes the popover. The
  new card then takes focus through `focusKey`. The editor tells Radix not to
  return focus to the trigger on close (`onCloseAutoFocus` calls
  `preventDefault` when a choice was made).
- The filter resets on each opening.

There are two kinds of trigger:

- **Final control.** An outline `Button` with a `Plus` icon and the text
  "Add block", after the list. When the list is empty, it sits in the empty
  state "No blocks yet."
- **Insert slot.** A slot sits between cards `i-1` and `i`. It is a
  horizontal rule with a centered small ghost icon button named "Insert block
  at position <i+1>". It is visible at reduced opacity and at full opacity on
  hover or focus. There is no slot before the first card or after the last,
  because the final control appends.

When the model has no block definitions, the section keeps its message "This
model does not allow blocks." and renders no Add block control.

*Rejected:*

- The Radix DropdownMenu for adding blocks. Its typeahead captures printable
  keys, so a text filter input inside it cannot receive them.
- A full combobox with `aria-activedescendant`. The popover with buttons gives
  the same keyboard reach with less code, and descriptions stay readable as
  descriptions.

### D7 — Tests

Every "Add <Type>" click moves to a helper that clicks "Add block" and then
the option named for the type inside the "Add block" dialog.

- `BlockEditor.test.tsx` is rewritten around menus. It covers:
  - Duplicate lands next to its source and takes focus.
  - Move up from the menu.
  - Collapse keeps the summary and sets `aria-expanded="false"`.
  - Insert through a slot with the filter.
  - The no-match state.
  - Remove, then Undo, restores the key and data.
  - A later add finalizes a removal.
  - An error keeps a collapsed block expanded.
  - The active highlight follows focus.
  - The save order and ULID keys still hold.
- New tests: `BlockCard.test.tsx`, `AddBlockMenu.test.tsx`,
  `RemovedBlockNotice.test.tsx`, and `block-presentation.test.ts`.
- `EntryPage.test.tsx` and `MediaPicker.test.tsx` switch to the helper.
- `e2e/editor.e2e.ts` switches to the menu and adds a drag-handle keyboard
  reorder (Space, ArrowUp, Space). The test waits on the labelled live-region
  announcements.
- `e2e/acceptance.e2e.ts` switches its image add to the menu.

## Risks / Trade-offs

- [Hidden fields keep Tiptap editors mounted, which costs memory with many
  blocks] → The limit is 200 top-level blocks, and editors are light.
  Unmounting would lose editor selection and cause media refetches. The
  trade-off can be revisited if profiling shows a problem.
- [An insert's position `max + 1024` does not reflect its index] → This matches
  today's add path. The array order is authoritative, and the server returns
  canonical positions on save.
- [An undo after a save re-adds a block whose key existed in an earlier
  revision] → Keys only need to be unique within one aggregate. The restored
  block is a new local change and makes the form dirty.
- [Viewers cannot collapse blocks, because the disabled fieldset disables the
  toggle] → The requirement already makes block controls non-editable for
  viewers. A read-only collapse can be added later if viewers need it.
- [Existing local databases record the old projection hash] → Configuration
  sync plans a label-only update, which `lace sync` applies. No structural
  change and no content change happen.

## Migration Plan

Deploy the content package and the admin together. Run `lace sync` for the
label-only update of the models that use built-in blocks. To roll back, revert
the commit. The earlier projection is again a label-only update.
