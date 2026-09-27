## Why

Roadmap Step 20, Session 20B (Redesign acceptance). Sessions 16A–20A rebuilt
every admin route on the Lace design system and layered structure, but nothing
yet proves the redesign as a whole: there is no automated accessibility gate,
keyboard coverage is spread across feature tests rather than one walkthrough,
the narrow-screen editor layout is specified but untested, and the theme lint
only rejects color literals, so arbitrary font sizes, radii, shadows, and
motion values can still bypass the tokens. Step 20 cannot be accepted, and
Step 21 should not start, until these checks pass and the Step 15C local
walkthrough succeeds on the redesigned admin.

## What Changes

- Add `@axe-core/playwright` and a browser accessibility suite that runs axe
  with the WCAG 2.x A/AA rule tags against every admin route (sign-in,
  content home, collection list, entry editor for a page and a collection
  entry, media library, Builds, Users, Settings, access denied, and not found)
  and against the main dialogs (add block, media picker, publish
  confirmation, create user, create build token). Any violation fails the
  suite and names the rule and the offending nodes.
- Add an automated keyboard-only walkthrough: sign in, reach a collection
  through the sidebar, open an entry, add a block, save with the shortcut,
  publish through the confirmation dialog, and open and dismiss a Users
  dialog, using only keyboard input and checking that focus stays visible.
- Add narrow-screen checks at 375px: no route scrolls horizontally, and the
  entry editor's Publication and Fields cards follow the blocks both visually
  and in keyboard order.
- Extend the theme lint so admin source also fails on arbitrary utility
  values that replace a design token: font size, border radius, box shadow,
  ring and outline width, and transition duration, delay, and easing.
  Replace the few existing bypasses with token utilities, adding a 2px
  `radius-xs` token for the tooltip arrow.
- Run the local product acceptance walkthrough on the redesigned admin and
  add axe checks to it at the content, editor, media, Users, and Settings
  screens with real data.
- Confirm that no admin source remains outside the layered structure (the
  legacy `app.tsx` and `components/ui.tsx` were already removed in Session
  16B) and update the README and architecture §17 to describe the
  accessibility and redesign acceptance checks. The acceptance spec's stale
  "pre-Step-16" Builds wording becomes "until Step 21".

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `admin-application-shell`: every admin route and main dialog passes
  automated WCAG A/AA checks; the main editorial flow completes with the
  keyboard alone.
- `admin-design-system`: the theme lint also rejects arbitrary typography,
  radius, shadow, focus-width, and motion values, and the radius scale gains
  `xs`.
- `admin-draft-editor`: the narrow-viewport stacking of the editor column is
  verified in a browser, not only described.
- `local-product-acceptance`: the walkthrough runs on the redesigned admin,
  includes automated accessibility checks, and describes the Builds
  placeholder as lasting until Step 21.

## Impact

- Architecture: §17 (Admin application — component source and design
  tokens) gains the token-bypass lint rule and the accessibility acceptance
  gate; §19 lists `@axe-core/playwright` as an admin test dependency. No
  invariant changes.
- Code: `apps/admin/e2e` (new accessibility suite, shared axe helper,
  acceptance axe checks), `apps/admin/playwright.config.ts` (run every
  non-acceptance suite), `scripts/check-admin-colors.mjs` and its tests and
  fixtures, `apps/admin/src/app/styles/theme.css` (`radius-xs`), and the
  components with arbitrary token values (`shared/ui/Calendar`,
  `shared/ui/Tooltip`, `pages/entry/EntryEditorActions`). Any accessibility
  violation the new checks uncover is fixed in the component that owns it.
- Dependencies: `@axe-core/playwright` 4.13.0 in the workspace catalog as an
  admin dev dependency.
- APIs, contracts, persistence, and runtime parity: none.
- Non-goals: dark mode, a manual screen-reader audit, visual regression
  snapshots, the Builds history screen (Step 21), and new admin features.
- Dependencies on earlier work: Sessions 16A–20A.
