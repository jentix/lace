## Why

Roadmap Step 16 ("Admin design foundation and structure"), Session 16A
("Architecture, tooling, and tokens"). Steps 17–20 rebuild every admin screen
against redesign direction A (neutral inset-panel shell, indigo accent, Inter,
13px base text). Today the admin styles itself through ~460 lines of
hand-written `lace-*` component CSS, a few ad hoc tokens, and several raw color
literals, and architecture §17/§19 do not record the component source model,
the approved UI dependencies, or the admin source layering. Screens cannot be
rebuilt consistently until the architecture, the dependency decision, and a
token system that can later add dark mode are in place.

## What Changes

- Update `docs/mvp-architecture.md` §17 and §19 and add ADR 0005: shadcn/ui is
  generated on Radix as Lace-owned source (never a themed runtime dependency);
  approved admin UI dependencies are `lucide-react`, `sonner`,
  `@tanstack/react-table`, `react-dropzone`, `react-day-picker`, and
  self-hosted Inter through `@fontsource-variable/inter`, plus the shadcn
  support utilities `clsx`, `tailwind-merge`, and `class-variance-authority`.
  Dependencies are installed when first used; 16A installs only Inter and the
  class utilities.
- Document the admin source layers and import direction
  `app → pages → widgets → features → entities → shared`, the no-cross-slice
  rule, `index.ts`-only slice public APIs, and one PascalCase folder per React
  component (with test and `index.ts`). Enforcement and the file move belong to
  Session 16B.
- Replace the ad hoc `--lace-*` variables with a theme file defining color,
  typography, spacing, radius, shadow, focus, and motion tokens as CSS
  variables in the shadcn naming convention, mapped into Tailwind through
  `@theme inline`. Ship the light theme only, under a `data-theme` selector
  structure that can add dark values later; remove Tailwind's default color
  palette so only token colors exist.
- Self-host Inter Variable and set the 13px base text size.
- Replace all hand-written `lace-*` component CSS with Tailwind utilities over
  the tokens, in the owned UI components and every current admin screen,
  without changing behavior, accessible names, or routes.
- Add `scripts/check-admin-colors.mjs`, run by `pnpm lint`, that rejects raw
  color literals (hex, color functions, named colors, and Tailwind default
  palette utilities) in admin source outside the theme file, with fixture tests.

Non-goals: generating shadcn primitives, creating the layered folders,
enforcing layer imports, moving Playwright specs (all Session 16B); the
inset-panel shell layout and screen redesigns (Steps 17–20); dark-mode values,
command palette, search, activity feed (post-MVP).

Dependencies: Steps 11–15 admin workflows (archived); roadmap Step 16 text as
committed in `d4889f6`.

Externally visible outcome: the admin renders in Inter at 13px with indigo
accent and neutral surfaces; all existing workflows and tests keep working;
`pnpm lint` fails on a raw color literal in admin source.

## Capabilities

### New Capabilities
- `admin-design-system`: the admin token contract (categories, naming, light
  theme and dark-ready selector structure, self-hosted font, base text size),
  the utilities-over-tokens styling rule, and the raw-color-literal lint gate.

### Modified Capabilities
- `admin-application-shell`: the "coherent accessible UI system" requirement
  now requires owned controls to be styled only through the
  `admin-design-system` tokens, adds shadow tokens, and requires styling
  through Tailwind utilities rather than hand-written component CSS.

## Impact

- Docs: `docs/mvp-architecture.md` §17, §19, §24; new
  `docs/adr/0005-admin-owned-component-source.md`; roadmap untouched.
- Admin: `apps/admin/src/styles.css`, new `apps/admin/src/theme.css`,
  `components/ui.tsx`, new class utilities, `app.tsx`,
  `rich-text-editor.tsx`, `media-preview.tsx`, component tests, and the
  acceptance e2e token locator.
- Tooling: new root script and tests in `tests/`, root `lint` script, pnpm
  catalog entries for `@fontsource-variable/inter`, `clsx`, `tailwind-merge`,
  `class-variance-authority`.
- No API, contract, persistence, or runtime-parity impact.
