## Context

See proposal.md for motivation. Observed state:

- `pages/model/ModelPage` resolves the model from the cached models query and
  renders `widgets/collection-entries/CollectionEntries` for collections.
  The widget uses `useInfiniteQuery` under `adminQueryKeys.entries(modelKey)`
  (`["admin", "entries", modelKey, null]`), renders the owned `Table`
  primitive by hand, and derives Draft/Published from `publishedSnapshotId`.
- `client.listEntries(modelKey, cursor, { q, status, sort, limit })` already
  sends the 17A query parameters. The API default sort is `-updatedAt`;
  `totals` count every status among entries that match `q` (the status filter
  does not narrow totals). A cursor is accepted only with the same `q`,
  `status`, and `sort`.
- The content-model response carries `listFields` (collection only, distinct,
  scalar: text, textarea, number, boolean, date, datetime, url, select) and
  field metadata with `type` and optional `label`. Entry summaries carry
  `listValues` (string, number, or boolean) that may omit a key.
- `modelRoute` in `app/router/router.ts` validates only params. Screens read
  route state with `getRouteApi` because `app/router` is above them.
- 17B shipped `EntryStatusBadge`, `formatRelativeTime`/`formatAbsoluteTime`,
  and the `modelEntries(modelKey)` invalidation prefix used by create, delete,
  save, and publish.
- `@tanstack/react-table` is approved (ADR 0005, architecture §17) but not yet
  installed. The current stable line is 9.x: `tableFeatures({...})`,
  `useTable({ features, columns, data, state, onSortingChange, manualSorting })`,
  `createColumnHelper<typeof features, Row>()`, and `table.FlexRender`.

## Goals / Non-Goals

**Goals:**

- A server-driven table (search, status, sort, cursor pages) whose query state
  lives in the URL and whose rows show state, list fields, and editors.
- Clear loading, empty, no-match, and error states and restyled dialogs.

**Non-Goals:**

- Client-side sorting or filtering, row selection, column visibility,
  virtualization, numbered pagination, `listFields` sorting or filtering, new
  API contracts.

## Decisions

### D1 — URL search state owned by the route and the page

`modelRoute` gains `validateSearch`, a pure `parseCollectionSearch` in
`app/router/collection-search.ts` that returns `{ q, status, sort }` with every
key present: `q` is trimmed and kept only when non-empty and at most
`MAX_ENTRY_SEARCH_LENGTH` (200) characters; `status` and `sort` are kept only
when they are members of `contentEntryStatusSchema` / `contentEntrySortSchema`;
`sort` equal to the default is dropped; anything rejected becomes `undefined`.
Explicit `undefined` keys matter because TanStack Router merges a route's
validated search over its parent's, and the root route's search is the raw,
unvalidated query string — an omitted key would let `status=archived` leak
through. The input parameter is typed with `SearchSchemaInput` so every
existing `Link`/`navigate` to `/content/$modelKey` keeps working without a
`search` prop. `DEFAULT_ENTRY_SORT` (`-updatedAt`) lives in `shared/api` next
to `EntryListQuery` so the router and the widget share it.

`ModelPage` reads `modelRoute.useSearch()` and passes it to the widget as
`query`, plus `onQueryChange(next)`, which calls
`navigate({ search: next, replace: true })`. The widget normalizes both the
incoming query and every change (blank search, default sort, and `undefined`
values dropped) so equivalent lists share one URL and one cache entry. Filter changes replace the
history entry so Back leaves the list instead of stepping through filters.
The widget stays router-agnostic and is tested with plain props.

*Rejected:* storing filters in component state or `localStorage` (fails the
reload/share acceptance); writing the cursor to the URL (cursors are opaque
and query-bound; a stale cursor would fail validation after any change).

### D2 — Query key and pagination

`adminQueryKeys.entryList(modelKey, query)` =
`["admin", "entries", modelKey, "list", { q, sort, status }]` (absent values
normalized to `null`), still under the `modelEntries(modelKey)` prefix so
existing invalidations refresh it. The unused `entries(modelKey, cursor)` key
is removed. `useInfiniteQuery` keeps `getNextPageParam: nextCursor` and uses
`placeholderData: keepPreviousData` so the previous rows stay while a new
query loads; `isPlaceholderData` marks the table region `aria-busy`. Each
query identity starts at the first page, which satisfies the cursor/query
binding. The footer shows "Showing {loaded} of {matching}" where matching is
`totals[status] ?? totals.all` from the first page, and "Load more entries".

### D3 — Search input debounce

The toolbar holds a local `draft` string initialized from `query.q`. A 300 ms
timeout after the last keystroke calls `onQueryChange({ ...query, q })`;
submitting (Enter) applies immediately. When `query.q` changes from outside
(clear filters, back/forward) the draft resyncs. The input is
`type="search"` with a visible search icon, placeholder "Search title or
slug", and an accessible label "Search entries".

### D4 — Status filter

A `role="group"` labelled "Filter by status" with four `Button`s
(`aria-pressed`): All, Draft, Published, Changed, each followed by its count
from `totals` (hidden while the first page loads). Selecting All removes
`status`. A "Clear filters" ghost button appears when `q` or `status` is set.
*Rejected:* Radix `Tabs` — tabs imply switching panels, and the list is one
region filtered in place.

### D5 — TanStack Table with manual sorting

`features = tableFeatures({ rowSortingFeature })`, created at module scope.
`useTable({ features, columns, data: items, getRowId: (row) => row.id,
manualSorting: true, enableSortingRemoval: false, enableMultiSort: false,
state: { sorting }, onSortingChange })`. `sorting` is derived from
`query.sort ?? "-updatedAt"` (`[{ id, desc }]`), and `onSortingChange` maps the
next state back to a sort value and calls `onQueryChange`. Columns
`title`, `publishedAt`, and `updatedAt` enable sorting; date columns set
`sortDescFirst: true` so the first activation shows newest first; all other
columns disable sorting. The row ID is used only as the React key and route
param, never rendered as text.

Because every admin `.tsx` module must be its own component folder, the slice
is split into `CollectionEntries` (query, heading, states, footer),
`EntryListToolbar` (search and status filter), `EntryListTable` (TanStack
Table columns and header rendering), and a pure `list-columns.ts`
(`listFieldColumns(model)`, `formatListValue`, and sort ↔ sorting-state
mapping). The table columns are:

| column | cell |
| --- | --- |
| Title | entry title as a link to `/content/$modelKey/$entryId`; below it the slug in muted monospace, or muted "No slug" |
| Status | `EntryStatusBadge` |
| each `listFields` key | header `fields[key].label ?? key`; cell via `formatListValue(field, value)` |
| Published | `formatDate(publishedAt)` inside `<time dateTime>`, or "—" with sr-only "Not published" |
| Updated | `formatRelativeTime` in `<time dateTime title={absolute}>` and "by {updatedBy.displayName}" |
| Actions (canManage only) | `DeleteEntryDialog` icon trigger |

`formatListValue`: boolean → "Yes"/"No"; number → `Intl.NumberFormat("en")`;
date → `formatDate` (UTC calendar date so a `YYYY-MM-DD` value does not shift
across time zones); datetime → `formatAbsoluteTime`; select, text, textarea,
url → the string, truncated visually with `title` holding the full value;
missing or type-mismatched → "—". `formatDate(iso)` is added to
`shared/lib/relative-time.ts` (`dateStyle: "medium"`).

Sortable headers render a ghost `Button` containing the label and an
`ArrowUp`/`ArrowDown`/`ArrowUpDown` icon (`aria-hidden`); the `<th>` carries
`aria-sort="ascending" | "descending" | "none"`.

*Rejected:* keeping the hand-built table — the roadmap requires TanStack
Table, and a typed column model keeps `listFields` columns data-driven.
*Rejected:* TanStack Table v8 — v9 is the current stable line and new code
should not start on the superseded major.

### D6 — States

- First page pending: the heading and toolbar render; the table area shows a
  `role="status"` "Loading entries" with five skeleton rows.
- First page error (no data): `ErrorState` with request ID plus a "Try again"
  button calling `refetch()`. `useSessionRecovery` still handles expiry.
- Next page error: rows stay; an `ErrorState` appears above "Load more".
- Empty collection (no items with no `q`/`status`): `EmptyState`
  "No entries yet" with the current guidance and, for managers, a
  `CreateEntryDialog` trigger as its action; the header create action is
  hidden in this state so the page offers one "Create entry" control.
- No matches (filters active, zero items): `EmptyState` "No matching entries"
  with a "Clear filters" action.

The heading block shows the collection label, the route pattern in muted
text, and the header "Create entry" action for managers. The heading `h1` has
`tabIndex={-1}` and a ref so deletion can return focus to it.

### D7 — Dialogs

`CreateEntryDialog({ modelKey, collectionLabel? })`: trigger `Button` with a
`Plus` icon and text "Create entry"; content has `DialogDescription`
("Add a draft to {label}. You can set its slug and fields in the editor."),
the title `TextField` (the first tabbable element, so Radix focuses it on
open without `autoFocus`), and a `DialogFooter` with a
`DialogClose` "Cancel" (outline) and a submit "Create entry" disabled while
the trimmed title is empty or the request is pending. The trimmed title is
sent. Closing resets the title and the mutation error. Behavior after success
(invalidate, close) is unchanged.

`DeleteEntryDialog({ entryId, expectedRevision, modelKey, title, onDeleted? })`:
trigger is a ghost `icon-sm` `Button` with a `Trash2` icon and
`aria-label="Delete {title}"`. Content: title "Delete entry?", description
"“{title}” will be permanently deleted. This cannot be undone.", footer with
`DialogClose` "Cancel" and a destructive "Delete entry" button ("Deleting…"
while pending). On success it invalidates as before, closes, and calls
`onDeleted`; `onCloseAutoFocus` is prevented after a successful deletion so
the widget can focus the heading (the trigger row no longer exists). Errors
stay in the dialog.

### D8 — Architecture and docs

Architecture §17 gains one sentence after the shell sentence: collection lists
are TanStack Table views over the entry-list API whose search, status filter,
and sort live in the route's search parameters, with cursor pagination and
list-field columns. `pnpm-workspace.yaml` pins `@tanstack/react-table`
9.2.4. No ADR: the dependency is already recorded in ADR 0005.

## Risks / Trade-offs

- [TanStack Table v9 API is newer than most examples] → usage limited to
  `tableFeatures`, `rowSortingFeature`, `useTable`, column helper, and
  `FlexRender`; covered by component tests.
- [Relative times drift while the page stays open] → absolute time in
  `title`/`dateTime`; acceptable for the MVP.
- [Wide lists with many `listFields` overflow narrow screens] → the `Table`
  primitive's container scrolls horizontally inside the panel; the page itself
  must not scroll horizontally (existing 375 px browser check).
- [Totals reflect only the first-page response] → a created or deleted entry
  invalidates the list, refetching totals.

## Migration Plan

Client-only change plus a new pinned client dependency; no data or API
migration. Rollback is a revert of the admin bundle and the catalog entry.
