## Why

Roadmap Step 17, Session 17C (Collection list). The collection route still
renders the Session 11B table: title, a draft/published badge derived from
`publishedSnapshotId`, a raw ISO `updatedAt`, a text "Delete" button, and
"Load more". Session 17A added derived status, slugs, editor display names,
`listFields` values, search, status filter, sort, and per-status totals, and
Session 17B built the final shell around the route. This change rebuilds the
list on those contracts so editors can find and judge entries at a glance, and
so a filtered list survives reloads and can be shared as a URL.

## What Changes

- Rebuild the collection route's entry list with TanStack Table (headless) over
  the owned `Table` primitive: title with slug, derived status badge, one
  column per configured `listFields` field (labelled from field metadata and
  formatted by field type), published date, and relative last-edit time with
  the editor's display name. No column or cell shows an entry or user ID.
- Add a list toolbar: a debounced title/slug search box and a status filter
  (All, Draft, Published, Changed) that shows the API's per-status totals for
  the current search. Title, published, and updated columns sort server-side
  from their headers, which expose the current sort direction.
- Keep `q`, `status`, and `sort` in the collection route's search parameters.
  Invalid values are dropped; the API default sort (`-updatedAt`) is omitted
  from the URL. Changing a filter restarts pagination at the first page; the
  opaque API cursor stays in memory and is never written to the URL.
- Keep "Load more entries" cursor pagination with a "Showing N of M" summary.
- Distinct states: skeleton rows while the first page loads; an empty
  collection with a create action for permitted roles; a no-matches state with
  "Clear filters"; an API error with "Try again"; a next-page error that keeps
  loaded rows; previous rows kept visible (marked busy) while a new filter
  loads.
- Restyle the create-entry dialog (description, autofocused title, blank-title
  guard, Cancel/Create footer, reset on close) and the delete-entry dialog
  (icon trigger named after the entry, destructive confirmation, Cancel,
  error kept inside the dialog, focus moved to the list heading after
  deletion).
- Viewers see the same rows, filters, and sorting without create or delete
  controls.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `admin-remote-state-and-lists`: collection lists gain entry-state columns,
  URL-backed search/filter/sort, no-match and retry states, and restyled
  create/delete confirmation behavior.

## Impact

- Architecture: §17 (Admin application). §17 gains one sentence describing the
  collection list; no invariant changes. `@tanstack/react-table` is already
  approved by ADR 0005 and architecture §17; this change adds it (pinned 9.2.4)
  to the pnpm catalog and the admin package.
- Code: `apps/admin/src/app/router` (collection search validation),
  `pages/model` (route search ↔ widget), `widgets/collection-entries`
  (rewritten: table, toolbar, columns, states), `features/create-entry` and
  `features/delete-entry` (restyled dialogs), `shared/api` (list query key),
  `shared/lib` (date formatting), tests, and the Playwright specs that touch
  the list.
- APIs: none. Consumes `GET /api/v1/admin/models/{modelKey}/entries` with
  `q`, `status`, `sort`, `after`, and the `totals` field from 17A, and
  `listFields`/field metadata from the content-model response.
- Non-goals: bulk selection and bulk actions, column visibility or resizing,
  numbered pages or page-size selection, filtering by `listFields` values,
  saved views, sorting by `listFields` columns (no API support), media library
  (Step 18), and editor changes (Step 19).
- Dependencies: Session 17A (entry-list contracts) and Session 17B (shell,
  `EntryStatusBadge`, relative-time formatter, `modelEntries` invalidation).
