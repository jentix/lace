## Why

Roadmap Step 16 ("Admin design foundation and structure"), Session 16B
("Layered skeleton and code migration"). Session 16A recorded the admin source
layers (`app → pages → widgets → features → entities → shared`) and the
token-only styling rule in architecture §17, but the admin still lives in a
2,185-line `app.tsx` plus loose modules, owns only a hand-written subset of UI
controls, and nothing enforces the layer rules. Steps 17–20 rebuild screens one
at a time; each rebuild needs a stable home for its route screen, reusable
sections, user actions, domain presentation, and a complete generated primitive
set, with lint catching structural drift before it spreads.

## What Changes

- Create `app/`, `pages/`, `widgets/`, `features/`, `entities/`, and `shared/`
  under `apps/admin/src` and move every admin module into them. `app.tsx` is
  dissolved: bootstrap and providers go to `app/`, the code-based TanStack
  route tree to `app/router/`, each route screen to `pages/<route>/`, the shell,
  collection list, block editor, and media library to `widgets/`, sign-in,
  sign-out, entry create/delete, publish confirmation, and media upload/delete
  to `features/`, and session, content-editing, and media presentation to
  `entities/`. The admin client, error mapper, and generic helpers go to
  `shared/`. No route, accessible name, request, or workflow changes.
- Generate the shadcn/ui primitives Button, Input, Textarea, Select, Dialog,
  Sheet, DropdownMenu, Popover, Tooltip, Badge, Table, Tabs, Skeleton, Toaster,
  Calendar, and ScrollArea with the pinned shadcn CLI, adapt them to Lace tokens
  and conventions, and place each in `shared/ui/<Component>/` with a test and
  `index.ts`. Existing Lace controls are rebuilt on them (EmptyState,
  ErrorState, a labelled text field, and a loading state stay Lace-owned). The
  unused Radix Toast control is replaced by the Toaster.
- Replace the field switch in the entry editor with a field renderer registry
  in `entities` so higher layers inject the media picker without an upward
  import.
- Extend `scripts/check-boundaries.mjs` (run by `pnpm lint`) to reject upward
  layer imports, cross-slice imports, imports into a slice or component folder
  other than its `index.ts`, admin source outside the layers, and React
  component modules that are not `<Name>/<Name>.tsx` beside an `index.ts` and a
  `<Name>.test.tsx`, with fixture tests.
- Split `app.test.tsx` route tests into the test files of the page, widget, or
  app component they exercise, using a shared test harness that mounts the real
  router; test intent is unchanged. Move Playwright specs to `apps/admin/e2e/`.
- Update architecture §17 (test-file and entry exceptions, public-unit
  definition for unsliced layers, enforcement now active) and §19 (Radix
  primitive packages added by this change; no animation plugin).
- Dependencies added through the catalog as first imported: `lucide-react`,
  `sonner`, `react-day-picker`, and Radix `slot`, `dropdown-menu`, `popover`,
  `tooltip`, `tabs`, `scroll-area`; `@radix-ui/react-toast` is removed.

Non-goals: visual redesign of any screen (Steps 17–20), adopting the new
primitives' interaction models where they would change behavior (for example
native `<select>` stays until Step 19), TanStack Table, react-dropzone, dark
theme values, path aliases.

Dependencies: Session 16A (`m16a-admin-design-tokens`, archived) tokens, theme
file, color-literal lint, and ADR 0005.

Externally visible outcome: the admin behaves exactly as before; `pnpm lint`
fails on an upward, cross-slice, or deep import in admin source; every admin
component lives in its own folder with its test.

## Capabilities

### New Capabilities
- `admin-source-structure`: the admin layer order and import direction,
  slice and component-folder public APIs, the permitted exceptions for entry and
  test files, and the lint gate that enforces them.

### Modified Capabilities
- `admin-design-system`: adds the requirement that admin UI primitives are the
  generated, Lace-owned shared primitive set styled only through tokens.
- `admin-application-shell`: the "coherent accessible UI system" requirement
  names the generated primitive set (Toaster replaces Toast, adding Textarea,
  Sheet, DropdownMenu, Popover, Tooltip, Tabs, Calendar, ScrollArea).

## Impact

- Docs: `docs/mvp-architecture.md` §17, §19; roadmap unchanged.
- Admin: every file under `apps/admin/src` moves; `index.html` entry unchanged
  (`src/main.tsx`); `playwright.config.ts` test directory; `package.json` lint
  paths and dependencies; `tsconfig.json` include.
- Tooling: `scripts/check-boundaries.mjs`, `scripts/check-admin-colors.mjs`
  (theme file path), new fixtures and tests in `tests/`, pnpm catalog and lockfile.
- No API, contract, persistence, authorization, or runtime-parity impact.
