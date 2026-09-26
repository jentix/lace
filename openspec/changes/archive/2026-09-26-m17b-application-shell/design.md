## Context

Session 16B moved the admin into `app → pages → widgets → features → entities
→ shared` and generated the shadcn primitives. The protected layout is
`widgets/admin-shell/AdminShell`: a 16rem aside with a flat
`navigationFor(role)` list (Content, Media, Builds, plus Users and Settings
for admins), a "Menu" button that toggles the same aside into a fixed overlay
below `md` without focus management, and a "Log out" ghost button above the
route content. `/content` (`pages/content/ContentPage`) renders plain links:
each page model runs `listEntries(modelKey)` to find its singleton, and each
collection links to its list.

Observed constraints:

- `AdminSession` is `{ id, role }`. `createBrowserSessionSource` reads
  `/api/auth/get-session`, whose Better Auth response also carries
  `user.name` and `user.email` (name defaults to the email at user creation).
- Session 17A entry lists return `items` (with `status`, `publishedAt`,
  `updatedAt`, `updatedBy.displayName`), `nextCursor`, and
  `totals { all, draft, published, changed }`, and accept `limit`.
- `CollectionEntries` uses `useInfiniteQuery` under
  `adminQueryKeys.entries(modelKey)` = `["admin", "entries", modelKey, null]`;
  create, delete, save, and publish invalidate exactly that key. A plain
  `useQuery` must not share it (the cached data shapes differ).
- Widgets may import entities and shared; they read route state through
  `getRouteApi`/`useRouterState` because `app/router` is above them.
- Tests run in jsdom, which ignores Tailwind breakpoints, so both the desktop
  sidebar and the sheet trigger are present in the accessibility tree there.

## Goals / Non-Goals

**Goals:**

- Direction-A inset shell with grouped, icon-labelled, role-aware navigation,
  collection counts, a user menu, and breadcrumbs.
- Narrow-screen navigation in a Radix Sheet with focus trap and focus return.
- `/content` as a status overview built on 17A summaries.
- No raw entry or user ID on any shell or overview surface.

**Non-Goals:**

- Collection table, search, filters, sort (17C); media counts; desktop sidebar
  collapse; dark mode; command palette; profile editing; new API contracts.

## Decisions

### D1 — Shell composition inside `widgets/admin-shell`

The widget is split into component folders, each with a test and `index.ts`:

- `AdminShell` — layout grid: skip link, desktop `<aside>` (`hidden md:flex`,
  `w-60`, `bg-sidebar`), and an inset `<div>` holding `ShellHeader` and
  `<main id="main-content" tabIndex={-1}>` rendered as a raised panel
  (`md:m-2 md:ml-0 md:rounded-xl md:border md:bg-background md:shadow-xs`) over
  the `bg-sidebar` page background. `AdminShellLayout` stays the route
  component.
- `SidebarNav` — brand link, the grouped navigation, and the user menu. It is
  rendered once in the aside and once inside the sheet; it takes an optional
  `onNavigate` callback used by the sheet to close itself.
- `UserMenu` — DropdownMenu trigger (initials avatar, display name, role) with
  a label block and a "Log out" item.
- `ShellHeader` — the narrow-screen "Open navigation" Sheet trigger and the
  breadcrumbs.

The shell keeps rendering sign-out errors with `ErrorState` above the route
content. `navigation.ts` keeps the pure, React-free navigation data
(`navigationGroups(role, models)` and `breadcrumbsFor`), unit-tested without
rendering.

*Rejected:* generating the shadcn `Sidebar` block. It brings a cookie-backed
provider, icon-collapse mode, and a keyboard shortcut we do not need, and
would add a large primitive to `shared/ui` for one consumer.

### D2 — Navigation groups and data

- **Content**: an ungrouped first item linking to the `/content` overview
  (`LayoutGrid`), current only on the overview itself. The "Lace" brand above
  it is plain text, so the overview has one tab stop.
- **Pages**: page models in configuration order. Each item resolves its link
  from the model's overview query (D3): the first item's ID gives
  `/content/$modelKey/$entryId`; while pending, on error, or when no
  singleton exists, the item links to `/content#pages`, the overview's Pages
  section that explains the missing draft. Matching with `includeHash` keeps
  this fallback from marking the overview as current. Icon `FileText`.
- **Collections**: collection models; link `/content/$modelKey`; count
  `totals.all` when loaded. The count is visible text marked `aria-hidden`,
  and an `sr-only` suffix (", 12 entries") keeps the accessible name
  meaningful. Icon `Layers`.
- **Library**: Media (`Image`) and Builds (`Hammer`) for all roles. Builds is
  placed here because it is shared with all roles and the Admin group is kept
  strictly admin-only, so it can be omitted as a whole for other roles.
- **Admin**: Users (`Users`) and Settings (`Settings`) when `role === "admin"`.

Groups with no items (e.g. no collections) are omitted. While models load,
the Pages/Collections area shows a `Skeleton`; a models error shows a compact
muted "Content unavailable" line (the route itself reports the error).

Active state: `Link` sets `aria-current="page"` on exact matches only, so the
collection item uses `activeOptions={{ exact: false }}` to stay current on its
entry routes; page items match their singleton route exactly. Styling uses
`aria-[current=page]:bg-sidebar-accent`.

### D3 — Entry overview query shared by the sidebar and `/content`

`entities/content` gains `useEntryOverview(modelKey)`, a `useQuery` for
`client.listEntries(modelKey, undefined, { limit: 1 })` under
`adminQueryKeys.entryOverview(modelKey)` =
`["admin", "entries", modelKey, "overview"]`, with `staleTime` 30 s. One
request per model yields both the page singleton (first item) and the
collection totals, and the sidebar and overview share the cache, so `/content`
issues no extra requests. `EntryListQuery` gains `limit`.

`adminQueryKeys.modelEntries(modelKey)` = `["admin", "entries", modelKey]` is
the invalidation prefix. Create, delete, save, and publish switch from
`entries(modelKey)` to `modelEntries(modelKey)`, which refreshes the infinite
list and the overview together.

N models cost N small requests per session start; the MVP targets a single
site with a handful of models, so a batched summary endpoint is deferred.

*Rejected:* reusing `entries(modelKey)`: incompatible cached shapes between
`useQuery` and `useInfiniteQuery`. *Rejected:* a new models-with-totals API
contract: 17A deliberately shipped per-model totals and the roadmap puts no
API work in 17B.

### D4 — Display name in the session

`AdminSession` gains optional `displayName`. `parseSession` sets it from a
non-empty trimmed `user.name`, else `user.email`; it is omitted otherwise. The
user menu shows it or "Signed-in user"; initials come from the display name
(first letters of up to two words, or the first letter of an email) and fall
back to a `User` icon. The role renders as a capitalized label. The ID is used
for nothing visible. Session policy remains `{ id, role }`-based; the name is
presentation only and stays out of route guards.

### D5 — Breadcrumbs

`ShellHeader` reads `useRouterState({ select: (s) => s.matches })` and takes
the deepest match's `routeId` and `params`. `breadcrumbsFor` maps:

| route id | crumbs |
| --- | --- |
| `/_protected/content` | Content |
| `/_protected/content/$modelKey` | Content › model label |
| `/_protected/content/$modelKey/$entryId` | Content › model label (collections only) › entry title |
| `/_protected/media` etc. | Media / Builds / Users / Settings |

Model labels come from the cached models query (`label ?? key`, "Content"
fallback while loading). The entry title comes from
`useQuery({ queryKey: adminQueryKeys.entry(entryId), queryFn: loadEntry })` —
the same key and function the editor uses, so it is deduplicated — as
`entry.draft.title`, falling back to "Entry". For a page singleton the model
crumb is the last crumb (the page label), so the entry title is not repeated.
Rendering: `<nav aria-label="Breadcrumb"><ol>`, links for all but the last,
`aria-current="page"` on the last, `ChevronRight` separators `aria-hidden`.
The page `<h1>` stays inside each route screen.

### D6 — Narrow screens and keyboard order

Below `md` the aside is hidden and `ShellHeader` shows a ghost icon Button
"Open navigation" (`PanelLeft` icon, named by `aria-label`) as a
`SheetTrigger`. `SheetContent side="left"` holds a visually
hidden `SheetTitle` "Navigation" and `SidebarNav onNavigate={close}`. Radix
Dialog traps focus, closes on Escape and on the close button, and restores
focus to the trigger on close; closing on link activation goes through the
same `onOpenChange(false)` path, so focus return also applies, after which the
route renders. The sheet state is local component state and closes on
breakpoint change implicitly because the trigger is hidden (`md:hidden`).

The first focusable element is a skip link "Skip to content"
(`sr-only focus:not-sr-only`) targeting `#main-content`. DOM order is skip
link → aside (brand, groups, user menu) → header → main.

### D7 — Content overview

`pages/content/ContentPage` renders a page heading with a one-line
description, then:

- **Pages** section: a card grid; each `PageCard` (inside the page slice)
  uses `useEntryOverview`. The card shows the label, `model.path`, an
  `EntryStatusBadge`, "Edited {relative} by {displayName}", and wraps its
  title in a link to the singleton editor. Missing singleton → the existing
  "Page draft missing" empty state with `pnpm content:sync`; error →
  compact `ErrorState` inside the card.
- **Collections** section: `CollectionCard`s with the label, route pattern,
  "{all} entries", and a row of published / changed / draft counts; the title
  links to the list.

Empty-models and models-error behavior is unchanged. `EntryStatusBadge`
(entities/content) maps draft → `warning` "Draft", published → `success`
"Published", changed → `secondary`-on-accent "Changed"; 17C reuses it.
`formatRelativeTime(iso, now = Date.now())` in `shared/lib` uses
`Intl.RelativeTimeFormat("en", { numeric: "auto" })` over seconds → years and
is paired with a `<time dateTime title>` carrying the absolute value.

### D8 — Architecture and docs

Architecture §17 gains one sentence: the shell groups navigation into Pages,
Collections, Library, and Admin from the content-model response and the entry
totals. No ADR: no dependency or invariant changes.

## Risks / Trade-offs

- [N overview requests on every session start] → shared cache with 30 s
  stale time; batched endpoint deferred until model counts grow.
- [Two `SidebarNav` instances in the DOM in jsdom] → tests scope queries to
  the `complementary`/`dialog` landmarks; in browsers the aside is
  `display:none` below `md`, so assistive tech sees one.
- [Relative times drift while a page stays open] → acceptable for the MVP;
  the absolute time is available in the `title`/`dateTime`.
- [Renamed controls break browser tests] → `editor.e2e.ts` is updated in the
  same change ("Menu" → "Open navigation", logout through the user menu).

## Migration Plan

Client-only change; no data or API migration. Rollback is a revert of the
admin bundle.
