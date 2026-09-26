## Why

Roadmap Step 17, Session 17B (Application shell). The admin shell still uses the
Session 11A layout: a flat Content/Media/Builds list, a "Menu" toggle that
repositions the same aside on narrow screens, and a bare "Log out" button in the
main area. Nothing tells the user which pages and collections exist, how much
content each holds, who is signed in, or where the current screen sits. Session
17A added the entry summaries (derived status, totals, editor display names)
that make a useful shell and content overview possible; this change consumes
them so Step 17C and Steps 18–20 can rebuild screens inside the final frame.

## What Changes

- Rebuild the protected layout as the direction-A inset-panel shell: a sidebar
  on the `sidebar` token family and route content in a raised, rounded panel.
- Group sidebar navigation into **Pages** (each page model, opening its
  singleton editor), **Collections** (each collection with its entry count),
  **Library** (Media and Builds, all roles), and **Admin** (Users and Settings,
  administrators only; the group is omitted otherwise). Every item has a
  `lucide-react` icon and marks the current location.
- Replace the header "Log out" button with a user menu at the sidebar foot
  showing the signed-in user's display name and role, with a keyboard-operable
  log out item. The browser session source additionally reads the display name
  (Better Auth `name`, falling back to `email`) from the existing same-origin
  session response; no raw user ID is ever shown.
- Add a route header with breadcrumbs derived from the matched route, model
  labels, and the loaded entry title, without internal identifiers.
- Below the `md` breakpoint, hide the sidebar and open the same navigation in a
  left Radix Sheet from an "Open navigation" header button; the sheet closes on
  navigation and returns focus to its trigger. A skip link leads to the main
  content.
- Rebuild `/content` as an overview: page cards with status, last edit time,
  and editor name; collection cards with totals and per-status counts. The
  existing no-models, missing-page-draft, and API-error states are preserved.
- Add a shared relative-time formatter and an entry status badge reused by 17C.
- Add an `entryOverview` query key and a per-model `modelEntries` invalidation
  prefix so entry creation, deletion, save, and publication refresh the
  sidebar counts and overview.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `admin-application-shell`: grouped, icon-labelled, role-aware sidebar with
  counts; user menu replacing the header logout action; breadcrumbs; narrow
  sheet navigation with focus return; skip link.
- `admin-remote-state-and-lists`: the content landing becomes a status overview
  of pages and collections while keeping its empty, unsynchronized, and error
  behavior.

## Impact

- Architecture: §17 (Admin application — navigation driven by the content-model
  response, source layers). No architecture invariant changes; §17 gains one
  sentence describing the shell navigation groups.
- Code: `apps/admin/src/widgets/admin-shell` (rewritten), `pages/content`,
  `entities/session` (display name), `entities/content` (status badge, overview
  query), `shared/lib` (relative time), `shared/api` (query keys), and the
  invalidation calls in `features/create-entry`, `features/delete-entry`, and
  `pages/entry`. Tests and `apps/admin/e2e/editor.e2e.ts` follow the renamed
  controls.
- APIs and dependencies: none. Uses existing `GET /api/auth/get-session`,
  `GET /api/v1/admin/content-models`, and the 17A entry-list totals;
  `lucide-react` and the Radix Sheet/DropdownMenu primitives are already owned.
- Non-goals: collection table, filters, and sort (17C); media counts (no media
  totals contract exists; Step 18); dark mode, command palette, site search,
  sidebar collapse-to-icons on desktop, and user profile editing.
- Dependencies: Session 16B (layers, primitives) and Session 17A (entry
  summaries with status, totals, and `updatedBy.displayName`).
