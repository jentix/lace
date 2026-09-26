## Context

See proposal.md for motivation. Current state observed in `apps/admin`:

- `src/app.tsx` (2,185 lines) holds the route tree, `createAdminRouter`,
  `AdminApp`, the shell, every route screen, the media surface and picker, the
  block editor, the field switch (`MetadataField`), and helpers such as
  `safeReturnPath`, `navigationFor`, `draftValues`, and `resolvedPublicPath`.
  Screens read the admin client and session through
  `useRouteContext({ from: rootRoute.id | protectedRoute.id })` and params
  through `modelRoute.useParams()`, i.e. through route objects defined in the
  same file.
- Loose modules: `admin-client.ts`, `session.ts`, `editor-form.ts`,
  `rich-text-editor.tsx`, `media-preview.tsx`, `components/{ui.tsx,cn.ts,layout.ts}`,
  `styles.css`, `theme.css`, `theme.test.ts`, `main.tsx`, `test/setup.ts`.
- `components/ui.tsx` provides Button, Input (labelled), Select (Radix,
  unused by screens), Dialog (title/trigger composite), Toast (Radix, unused by
  screens), Table, Badge, Skeleton (status role with label), EmptyState, and
  ErrorState.
- `app.test.tsx` (1,387 lines, 43 tests) mounts `createAdminRouter` with a
  memory history and a stub `AdminClient`; other tests cover the client, form
  model, session, preview, theme, and UI controls (67 tests total).
- Playwright specs `editor.e2e.ts` and `acceptance.e2e.ts` live in `src/`;
  `playwright.config.ts` uses `testDir: "./src"`.
- `scripts/check-boundaries.mjs` checks package edges with the TypeScript 7
  scanner and throws on the first violation; `tests/boundaries.test.mjs` runs
  it against fixture roots. `scripts/check-admin-colors.mjs` exempts
  `theme.css` at the source root.
- TypeScript uses `NodeNext` resolution, so relative imports carry `.js`
  extensions and directory imports are not allowed.

## Goals / Non-Goals

**Goals:**

- A move that preserves every test's intent, route, accessible name, and
  request sequence, so regressions are attributable to later sessions.
- A boundary check precise enough to run on the whole admin with no
  suppressions, and fixture-tested for each violation class.
- Generated primitives that later sessions use directly instead of writing
  new controls.

**Non-Goals:**

- Adopting primitive interaction models that change behavior: native
  `<select>`, the checkbox, `window.confirm` confirmations, and the inline
  discard/conflict panels stay as they are until their screens are rebuilt.
- Splitting the entry editor's save/publish/reload state machine into
  features; it moves intact into its page (Step 19 rebuilds it).

## Decisions

### D1. Target tree

```text
src/
  main.tsx                         entry: mounts AdminApp, imports styles
  test/setup.ts                    Vitest environment setup
  app/
    AdminApp/                      QueryClient, Router, Tooltip providers, Toaster
    router/                        code-based route tree, createAdminRouter, Register
    styles/                        styles.css, theme.css, theme.test.ts
    testing/                       test-only harness (renderRoute, stubClient, fixtures)
  pages/
    login/LoginPage  content/ContentPage  model/ModelPage  entry/EntryPage
    media/MediaPage  builds/BuildsPage  users/UsersPage  settings/SettingsPage
    not-found/NotFoundPage  pending/PendingPage
  widgets/
    admin-shell/AdminShell (+ navigationFor)
    collection-entries/CollectionEntries
    block-editor/BlockEditor
    media-library/MediaLibrary, MediaPicker
  features/
    sign-in/SignInForm   sign-out (useSignOut)
    create-entry/CreateEntryDialog   delete-entry/DeleteEntryDialog
    publish-entry/PublishEntryDialog (+ buildDispatchDescription)
    upload-media/MediaUpload   delete-media (useMediaDeletion, description)
  entities/
    session/   session sources, useSession, useSessionSource, useSessionRecovery
    content/   draft form model, draft/public-path helpers, FieldRenderer
               registry, RichTextEditor
    media/     MediaPreview, accepted types and size limit
  shared/
    api/       admin client, query keys, errors, error mapper, useAdminClient
    lib/       cn, safeReturnPath
    ui/        generated primitives, EmptyState, ErrorState, LoadingState,
               TextField, PageState, layout recipes
```

`index.html` keeps loading `/src/main.tsx`. Route screens stay one per
route; screen-private subcomponents (`UserRow`, `PageModelLink`,
`SortableBlockCard`) stay non-exported inside their component module.

### D2. Route context without importing the route tree

Pages and lower layers cannot import `app/router`, so they read router state
through TanStack Router's `getRouteApi(id)` with string route ids
(`"__root__"`, `"/_protected"`, `"/_protected/content/$modelKey"`, …). Types
come from the `Register` augmentation in `app/router`, which is type-only and
global, so no runtime upward import exists. `shared/api` exposes
`useAdminClient()` (root context), and `entities/session` exposes
`useSession()` (protected context), `useSessionSource()`, and
`useSessionRecovery()`. Route context contents and route ids are unchanged.

Alternatives: a separate React context for the client (rejected: duplicates the
router context that `beforeLoad` guards already use, and two sources could
diverge in tests); passing route objects down as props (rejected: every page
would need app-provided props, recreating the coupling).

### D3. Field renderer registry

`entities/content` exports `FieldRenderer` (formerly `MetadataField`), a
`FieldRendererRegistry` type mapping field types to renderer components, and a
`FieldRendererProvider`. Built-in renderers cover text, textarea, number,
date, url, boolean, select, and rich text with the exact previous markup, ids,
and `aria-describedby` wiring. The `media` renderer is supplied by the entry
page through the provider using `widgets/media-library` `MediaPicker`; without
a provided media renderer the field shows an explanatory message. The
block-editor widget renders `FieldRenderer` and therefore needs no dependency
on the media widget.

Alternative: pass a `renderMedia` prop through every field and block (rejected:
threads a media concern through unrelated components).

### D4. Generated primitives

The primitives are generated with `shadcn@4.21.0` (`style: new-york`, base
color `neutral`, lucide icons) in a disposable project and copied into
`shared/ui/<Component>/<Component>.tsx`, then adapted:

- imports use `shared/lib` `cn` and individual `@radix-ui/react-*` packages
  (matching the existing dialog/select dependencies) instead of the `radix-ui`
  meta-package; `"use client"` directives are dropped;
- raw colors are replaced by tokens (`bg-black/50` → `bg-overlay`,
  `text-white` → `text-destructive-foreground`) so the color gate passes;
- `tw-animate-css` enter/exit classes (`animate-in`, `fade-*`, `zoom-*`,
  `slide-*`) are removed rather than adding an unapproved plugin; motion tokens
  remain available for later sessions;
- Button keeps Lace behavior: `type="button"` by default, 16A density
  (`h-8`/`h-7`), and variant names `default`, `outline`, `secondary`, `ghost`,
  `destructive`, `link`; call sites map `secondary` → `outline` and
  `quiet` → `ghost`. Badge adds `success` and `warning` variants (call sites
  map `tone` → `variant`);
- interactive controls drop the generated `outline-none` and `ring-[3px]`
  focus halo so the 16A global `:focus-visible` outline drawn from the `ring`
  token remains the single focus indication (menu items keep their highlighted
  background, which Radix moves with focus);
- Dialog and Sheet close buttons keep the accessible name "Close dialog";
- the Toaster drops `next-themes`, uses the light theme and a close button,
  and is mounted once in `AdminApp` with `TooltipProvider`.

Lace-owned composites built on them: `TextField` (label + Input, replacing the
labelled `Input`), `LoadingState` (status role + label + Skeleton lines,
replacing the labelled `Skeleton`), `EmptyState`, `ErrorState`, and
`PageState` (`PageLoading`, `PageError`, `PagePlaceholder`, `PageAccessDenied`,
formerly `RouteLoading`/`RouteError`/`RoutePlaceholder`/`AdminRoutePage`).
Call sites compose Dialog and Table parts directly. Plain `<input>` and
`<textarea>` controls become the Input and Textarea primitives (same elements
and attributes). The layout recipes move to `shared/ui/layout`.

### D5. Boundary check for admin layers

`checkBoundaries` gains `checkAdminStructure(root)`, run when
`apps/admin/src` exists, using the same scanner. For each source file under
`apps/admin/src`:

1. Classify: layer = first path segment when it is a layer; `main.tsx` and
   `vite-env.d.ts` at the root are entry modules; `test/` is setup; anything
   else fails.
2. Resolve each relative specifier (`.js` → `.ts`/`.tsx`, `?raw` suffix
   stripped). Non-TypeScript targets (CSS) are checked for layer direction only.
3. Unit of a target: `<layer>/<slice>` for sliced layers; for `app` and
   `shared` the shallowest directory with an `index.ts` (`app/router`,
   `app/testing`, `shared/api`, `shared/lib`, `shared/ui/Button`,
   `shared/ui/layout`), falling back to the segment directory. `app` has no
   root `index.ts`, so the entry imports `app/AdminApp` and the test-only
   `app/testing` harness never enters the production module graph. A sliced-layer slice
   without `index.ts` fails.
4. Direction: allowed when the source is entry or a test file, the target is in
   the source's own unit, the target layer ranks lower, or both are in the same
   unsliced layer (`shared` or `app`).
   Same sliced layer, different slice → cross-slice error; higher layer →
   upward error.
5. Public API: when the target lies outside the source's unit, it must be the
   unit's `index.ts`. When the target lies in a PascalCase component folder
   other than the one containing the source, it must be that folder's
   `index.ts`.
6. Component folders: every non-test `.tsx` file must be `<Dir>/<Dir>.tsx` with
   `Dir` PascalCase; every PascalCase directory must contain `<Dir>.tsx`,
   `index.ts`, and `<Dir>.test.tsx`.

Errors keep the existing throw-on-first-violation behavior with messages that
name the file, the rule, and the specifier. Fixture roots under
`tests/fixtures/admin-structure/` cover allowed, upward, cross-slice,
deep-import, component-deep-import, incomplete component folder, misplaced
component, missing slice index, outside-layer file, and test-file exception.

Alternatives: path aliases such as `@/shared/ui` (rejected for now: NodeNext
resolution, Vite, Vitest, and the checker would all need alias configuration,
while relative paths already resolve everywhere); an FSD-specific linter
(rejected: not compatible with the TypeScript 7 scanner baseline and adds a
dependency the existing checker covers).

### D6. Tests

`app.test.tsx` fixtures and `renderRoute` move to `app/testing` (a `.ts`
module using `createElement`), and each test moves unchanged into the test file
of the unit it exercises: app-level routing/session tests into
`AdminApp.test.tsx`; navigation into `AdminShell.test.tsx`; content landing into
`ContentPage.test.tsx`; collection list and entry create/delete into
`CollectionEntries.test.tsx` and `ModelPage.test.tsx`; editor tests into
`EntryPage.test.tsx`; media into `MediaPage.test.tsx`/`MediaLibrary.test.tsx`;
users and settings into their page tests; sign-in into `LoginPage.test.tsx`.
Units without a moved test get focused tests (primitives, composites, features,
registry, pending/not-found/builds pages). `components/ui.test.tsx` assertions
move to the corresponding primitive and composite tests. Test count may grow;
no existing assertion is weakened.

Playwright specs move to `apps/admin/e2e/` unchanged except path-independent
imports; `playwright.config.ts` uses `testDir: "./e2e"`. `oxlint` and
`tsconfig.json` include `e2e`.

### D7. Dependencies and docs

Catalog additions: `lucide-react`, `sonner`, `react-day-picker`,
`@radix-ui/react-slot`, `@radix-ui/react-dropdown-menu`,
`@radix-ui/react-popover`, `@radix-ui/react-tooltip`, `@radix-ui/react-tabs`,
`@radix-ui/react-scroll-area` at current stable versions; remove
`@radix-ui/react-toast`. The shadcn CLI is not a workspace dependency (it runs
once through `pnpm dlx`/`npx` with a pinned version). Architecture §17 records
the entry/test exceptions, the unit definition, relative imports, and active
enforcement; §19 records the Radix packages and the no-animation-plugin rule.
The color check exempts `app/styles/theme.css` instead of `theme.css`.

## Risks / Trade-offs

- [Behavior drift while moving 2,000 lines] → move code verbatim per unit,
  keep route ids and markup, and run the full split test suite plus the editor
  Playwright suite before completion.
- [Primitive substitutions alter DOM that tests query] → preserve element
  types, labels, roles, and accessible names; only class lists change.
- [Type recursion through `Register` and `getRouteApi`] → the same
  self-reference already exists in `app.tsx`; verify with root typecheck.
- [Sonner or Radix tooltip needing browser APIs absent in jsdom] → mount them in
  `AdminApp` and run the route tests; add setup shims only if needed.
- [Required tests for every component folder add thin tests] → keep them
  focused on each component's accessible contract rather than snapshots.

## Migration Plan

Pure source reorganization inside `apps/admin`; no data or API migration.
Rollback is reverting the change.
