## Context

`pages/entry/EntryPage` is one 400-line component. It uses the pre-redesign
layout recipes (`pageClass`, `panelClass`, `formClass` with `max-w-md`). It has
two Save buttons: a header "Save" and a form-bottom "Save draft". It prints
`Last edited by <user id> at <ISO>`, and it renders the discard prompt and the
conflict recovery as inline dashed panels. It also offers Save to every role.

Current facts the design relies on:

- `loadEntry` and `saveDraft` return `AdminContentEntryDto`, which carries
  `updatedBy.displayName`. `publishEntry` returns `{ build: { status } }`, with
  status `accepted`, `not-dispatched`, `rejected`, or `unavailable`.
  `buildDispatchDescription` already turns that status into text.
- No admin API reads `site_builds`. `/builds` is a placeholder until Step 21C.
- The server derives entry status as follows: no published snapshot is
  `draft`; published revision equal to draft revision is `published`;
  otherwise `changed`. `EntryStatusBadge` renders that status.
- The shell header (`widgets/admin-shell/ShellHeader`) renders breadcrumbs.
  The page scrolls on the window, and no ancestor of the header clips
  overflow.
- `FieldRenderer` resolves a renderer from a context registry.
  `FieldRendererProvider` supplies the media picker. Block fields render
  through the same `FieldRenderer`.
- Datetime values must match `YYYY-MM-DDTHH:MM:SS(.sss)?Z`. Date values are
  `YYYY-MM-DD`.
- Primitives available: Select (Radix), Popover, Calendar (react-day-picker),
  Dialog, Badge, Input, Button (defaults to `type="button"`). No Switch exists.
- Tests and e2e specs locate controls by name: "Save draft",
  `Saved revision N`, "Publication status" region, "Title", "Publish", and
  "Confirm publication". The acceptance spec already expects a viewer to see no
  "Save draft".

## Goals / Non-Goals

**Goals:**

- One Save control and a shortcut, kept visible in the sticky header.
- A layout that later sessions can fill: 19B replaces the block list inside the
  main column, and 19C adds a toolbar and a validation summary.
- Keep the accessible names that tests and acceptance rely on wherever the
  meaning is unchanged.

**Non-Goals:**

- Changing BlockEditor internals, the rich-text toolbar, or the link prompt.
- Any API change.

## Decisions

### D1 — Header actions through a shell slot (portal)

`widgets/admin-shell` gains an internal context module, `header-actions.ts`,
that holds `HTMLElement | null | undefined`, and a public
`ShellHeaderActions({ children })` component:

- `AdminShell` keeps `useState<HTMLElement | null>(null)` and provides it.
- `ShellHeader` receives an `actionsRef` callback and renders
  `<div className="ml-auto flex shrink-0 items-center gap-2" ref={actionsRef}>`
  after the breadcrumbs.
- `ShellHeaderActions` portals `children` into that element. With no provider
  (`undefined`, for isolated tests) it renders them inline. Before the target
  is attached (`null`) it renders nothing.

`ShellHeader` becomes `sticky top-0 z-30 bg-background` (plus `md:rounded-t-xl`
to match the inset panel). The pages layer may import widgets, so `EntryPage`
imports `ShellHeaderActions`. When the entry page unmounts, the portal content
goes with it, so other screens leave the slot empty.

*Rejected:* a second sticky bar inside the page under the shell header. Its
`top` offset would depend on the header's height, and wrapped breadcrumbs make
that height variable, so the two bars would overlap. Duplicating breadcrumbs
inside the page was also rejected, because it would give two "Breadcrumb"
landmarks.

### D2 — One Save control bound to the form

The header Save is `<Button form="entry-draft-form" type="submit">`, which
works through the `form` attribute from inside the portal. Its visible text is
"Save" (or "Saving…"), followed by an `aria-hidden` `<kbd>` hint (`⌘S` or
`Ctrl S`). `aria-label="Save draft"` keeps the accessible name, which contains
the visible "Save" and so satisfies label-in-name. It also carries
`aria-keyshortcuts="Meta+S Control+S"`. The form-bottom button is removed.
Enter in a single-line input still submits through the associated submit
button.

`shared/lib/save-shortcut.ts` exports `useSaveShortcut(onSave)` and
`saveShortcutLabel()`:

- The hook adds a `window` `keydown` listener.
- On `(metaKey || ctrlKey) && !altKey && !shiftKey && key.toLowerCase() === "s"`
  it always calls `preventDefault()` and then calls the latest `onSave` through
  a ref. The hook is generic, so it lives in `shared/lib`.
- Both modifiers are accepted on every platform, so a Windows keyboard on a Mac
  still works. This is a superset of the spec's platform key, and the hint
  shows the platform key.
- Platform detection uses `navigator.userAgentData?.platform ?? navigator.platform`
  tested against `/mac|iphone|ipad|ipod/i`.

The page's `onSave` does nothing when the user is read-only, the form is clean,
or a save is pending. Otherwise it runs
`form.handleSubmit(save.mutate)()`, so the shortcut follows the same
validation path as the button.

### D3 — Save-state indicator

This is a `role="status"` text in the header slot. The first condition that
holds wins:

| Condition | Text |
|---|---|
| viewer | `View only` |
| saving | `Saving…` |
| dirty and the last save failed | `Not saved` |
| dirty | `Unsaved changes` |
| otherwise | `Saved revision N` |

A small dot (`bg-warning-foreground` when dirty, `bg-success-foreground` when
saved, `bg-destructive` when not saved) accompanies the text, and it is
`aria-hidden`. The text carries the meaning, so the indicator does not rely on
color.

### D4 — Page structure

`EntryPage` keeps its data, mutations, and form logic. Presentation splits into
internal page-slice components, each in its own folder with a test and an
`index.ts`:

- `EntryPublicationDetails` — the "Publication status" region.
- `EntryEditorActions` — the header indicator, Save, and Publish.
- `EntryConflictAlert` — the restyled conflict recovery.
- `DiscardChangesDialog` — the modal discard prompt.

Layout:

```text
<ShellHeaderActions><EntryEditorActions/></ShellHeaderActions>
<form id="entry-draft-form" className="grid max-w-[80rem] gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
  <fieldset disabled={readOnly} className="contents">
    <div main column>
      <h1 small muted>Edit <model label></h1>
      conflict alert / save error
      title input (sr-only label "Title", text-2xl font-semibold, transparent border until hover/focus)
      <BlockEditor/>
    </div>
    <aside aria-label="Entry details" className="grid gap-4">
      <EntryPublicationDetails/>
      <section aria-labelledby="entry-fields-title"> slug + model fields </section>
    </aside>
  </fieldset>
</form>
```

The h1 keeps the text "Edit <label ?? key>" that tests use. The aside follows
the main column in the DOM, so narrow screens stack it after the blocks.
`display: contents` on the fieldset keeps it out of the grid while
`disabled` still disables every native control inside it, including buttons
(Select, date, and Switch triggers, and media and block buttons).

### D5 — Publication details

`EntryPublicationDetails({ entry, model, latestBuild, children })` is a card
titled "Publication" with an `EntryStatusBadge` from the new
`entryStatus(entry)` helper in `entities/content/draft.ts`, followed by a
`<dl>`:

| Term | Value |
|---|---|
| Live | "Revision 3 · <time>published 2 hours ago</time>" or "Not published" |
| Draft | "Revision 4" |
| Last edited | "<displayName> · <time>5 minutes ago</time>" |
| Public URL | `resolvedPublicPath` in `<code>`, or "No public URL yet" |
| Latest build | `buildDispatchDescription(latestBuild)`, or "No build requested from this editor." plus a "View builds" link to `/builds` |

- Each `<time>` has `dateTime={iso}` and `title={formatAbsoluteTime(iso)}`,
  with `formatRelativeTime` as its visible text. The ISO string never appears
  as text.
- `children` carries the publish retry and error row.
- `latestBuild` is page state set in `publish.onSuccess`. It replaces the
  previous `publishMessage`, the message text stays the same, and it resets
  when `entryId` changes.
- The live time uses `published.updatedAt`. A published snapshot is created at
  publication, and it uses the same field the entry list uses for
  `publishedAt`.

### D6 — Field renderers

`FieldRenderer` keeps the registry, the provider, and the shared label,
description, and error wrapper. The built-in controls move to a slice-internal
`entities/content/FieldControls` component folder. The boundary check requires
each `.tsx` module to be `<Folder>/<Folder>.tsx`, so the controls share one
module. The shared prop types move to `entities/content/field-types.ts`. The
slice's public API is unchanged.

- Cleared values are held as `null`. React Hook Form's `Controller` shows the
  loaded default again when a value becomes `undefined`. This pre-existing
  bug made a saved optional value impossible to clear visibly. So
  `FieldRenderer` stores a renderer's `undefined` as `null` and hands
  renderers `undefined` back. Local validation skips `null`, and
  `withoutClearedValues` removes `null` from fields and block data before the
  save request and the copied local JSON. Drafts therefore never carry `null`.

- `FieldRendererProps` gains `invalid: boolean`. Every control sets
  `aria-invalid={invalid || undefined}`. `MediaPicker` ignores it.
- `FieldRendererProvider` gains an optional `readOnly` that is provided through
  the same context. `RichTextField` passes it to `RichTextEditor`, which gains
  a `readOnly` prop and calls `editor.setEditable(!readOnly)`.
- Select: `Select` with `value={value ?? ""}`. `SelectTrigger` carries
  `id`, `aria-describedby`, `aria-invalid`, and `className="w-full"`, with
  `SelectValue placeholder="Select an option"`. Optional fields add a
  "No selection" item with the sentinel value `"\u0000none"`, which maps to
  `undefined`.
- Date: `DateField` is a `Popover` whose trigger is an outline `Button` with
  `id` and a `CalendarIcon`. The trigger shows `formatDate(value)` or
  "Pick a date", and `aria-describedby` includes a hidden-value span.
  `PopoverContent` holds `Calendar` with `mode="single"`, `autoFocus`,
  `selected`, and `defaultMonth`. Selecting a day writes local `y-m-d`
  components as `YYYY-MM-DD` and closes the popover. Radix returns focus to
  the trigger. Optional fields with a value show an icon button
  "Clear <label>".
- Datetime: `DatetimeField` combines the same picker for the date part with an
  `Input type="time"` labelled "<label> time (UTC)". The value is parsed with
  `/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/u`, never through `Date`, so there is
  no time-zone shift. Choosing a date with no time composes `T00:00:00.000Z`,
  and a time change composes `${date}T${hh}:${mm}:00.000Z`. The time input is
  disabled until a date exists. A muted "UTC" note is described by the input.
- URL: `Input type="url"` with a leading `Link2` icon (`pl-8`). When the value
  parses as an http(s) URL, a trailing ghost icon `Button asChild` renders
  `<a target="_blank" rel="noopener noreferrer">` named "Open <label> in a new
  tab".
- Boolean: the new `shared/ui/Switch` is a native
  `<button role="switch" aria-checked>` with a thumb span and token classes
  (`bg-primary` or `bg-input`). It takes `checked`, `onCheckedChange`, and the
  button props, and it gets a component folder and a test. The field label's
  `htmlFor` names it.
- Number, text, and textarea: the existing `Input` and `Textarea` gain
  `aria-invalid`, and number gains `inputMode="decimal"`.
- The field wrapper keeps label, description, control, and error. It uses
  `text-sm font-medium` labels, `text-xs text-muted-foreground` descriptions,
  and `text-xs text-destructive` errors.

*Rejected:* Radix Switch, because it adds a dependency outside the approved
admin list for about 30 lines of markup. A native `type="date"` input was also
rejected, because browsers draw it inconsistently and it cannot use the
shared Calendar.

### D6a — Read-only media fields

`MediaPicker` reads the renderer's `readOnly`. When it is set, the picker
renders `SelectedMedia` with a new `readOnly` flag that omits Replace and
Remove, or the plain "No media selected" line when there is no value. It does
not mount the dialog. The dialog keeps its own role gating for uploads, and
the viewer-browse coverage moves to the `MediaPickerDialog` test.

### D7 — Dialogs and alerts

- `PublishEntryDialog` gains `revision` and `publicPath` props. Its description
  names the draft revision that becomes live and the path when present. It
  adds a `DialogFooter` with `DialogClose` "Cancel" (outline) and
  "Confirm publication". The trigger stays a Button named "Publish", and the
  title stays "Publish this entry?".
- `EntryConflictAlert` is a bordered destructive card with `role="alert"`, a
  `TriangleAlert` icon, the same heading "Draft changed elsewhere", the same
  text, and the same two actions. Copy and reload errors stay inside it. It
  renders above the title in the main column.
- `DiscardChangesDialog` is a controlled `Dialog` with
  `open={blocker.status === "blocked"}` and `DialogContent role="alertdialog"`.
  Radix spreads the prop over its default `role="dialog"`. It keeps the title
  "Discard unsaved changes?" and the buttons Stay (default, auto-focused) and
  "Leave without saving". `onOpenChange(false)` calls `blocker.reset()`, so
  Escape or the close control means stay.
- A non-conflict save error renders `ErrorState` in the main column, in the
  same position as the conflict alert.

### D8 — Test updates

- `EntryPage.test.tsx`:
  - Select interaction moves to click on the combobox and then the option.
  - Boolean uses `getByRole("switch")`.
  - Date uses the calendar.
  - Datetime uses a date plus a time.
  - The publication test asserts the display name and the absence of `editor-1`
    and ISO text.
  - New tests cover the shortcut (`keyboard("{Control>}s{/Control}")`), the
    clean-shortcut no-op, viewer read-only, Cancel in the publish dialog, the
    no-build text, and the discard alertdialog.
- New unit tests: `Switch`, `ShellHeaderActions` (inline fallback and portal
  into the header), `save-shortcut`, `entryStatus`, and `FieldRenderer`
  controls (select clear, date and datetime composition, URL open link, and
  `aria-invalid`).
- `e2e/editor.e2e.ts` keeps its "Save draft" and "Saved revision" assertions,
  which still hold, and gains `Control+S` saving plus the sticky-header
  visibility check. `acceptance.e2e.ts` needs no change.

## Risks / Trade-offs

- [The portal places Save and Publish before the skip-link target] → The spec's
  keyboard order is skip link, navigation, header, then content. Editor
  actions in the header follow that order, and the skip link still jumps to
  content.
- [`display: contents` fieldsets have had accessibility-tree bugs] → The
  fieldset has no name or role to expose. It is used only for `disabled`, and
  the controls keep their own labels.
- [Radix Select and react-day-picker in jsdom] → The shared setup already stubs
  `ResizeObserver`, `scrollIntoView`, and pointer capture, and the Select
  primitive has a passing test. Calendar tests start from a value in a fixed
  month so they do not depend on today's date.
- [A datetime time edit drops seconds] → Seconds are rarely authored. Values
  that are not edited are never rewritten, so a loaded value stays clean.
- [The latest build state is session-local] → The spec names this limitation.
  Step 21C replaces the source with a persisted read, and the "View builds"
  link already points to the future home of that data.

## Migration Plan

This is a frontend-only change. No stored data or contract changes. Roll back by
reverting the commit.
