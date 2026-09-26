## Context

See proposal.md for motivation. Current state observed in `apps/admin`:

- Tailwind CSS 4 runs through `@tailwindcss/vite`, but components use
  hand-written `lace-*` classes defined in `src/styles.css` (~460 lines) over
  ad hoc `--lace-*` variables. Several rules contain raw literals (`#171b2a`
  sidebar, `#e9edff` highlight, badge fills, `white`, `rgb(...)` shadows), and
  `.lace-rich-text` references an undefined `--lace-border`.
- Owned controls live in `src/components/ui.tsx` on Radix Dialog, Select, and
  Toast. `src/app.tsx` (~2100 lines) holds every route screen and uses about
  70 `className` sites; `rich-text-editor.tsx` and `media-preview.tsx` add a
  few more.
- `components/ui.test.tsx` asserts two `--lace-*` variable values;
  `acceptance.e2e.ts` locates the issued build token through
  `.lace-token-value`. No other test depends on class names.
- `scripts/check-boundaries.mjs` scans TypeScript with
  `typescript/unstable/ast` `createScanner`, runs from root `pnpm lint`, and is
  tested by `tests/boundaries.test.mjs` against fixtures.
- Vitest runs admin tests in jsdom with `css: true`.

The source files stay where they are; Session 16B performs the layered move.

## Goals / Non-Goals

**Goals:**

- One theme file that is the only home for color values, in shadcn variable
  names so 16B-generated primitives compile against it unchanged.
- Zero component-specific CSS rules; every component styled by utilities.
- A lint gate that is precise enough to run on the whole admin source with no
  suppressions.
- Keep every accessible name, role, route, and test intent unchanged.

**Non-Goals:**

- Pixel-level fidelity to direction A. Screen layouts are rebuilt in Steps
  17–20; 16A only moves the existing layout onto tokens with direction A's
  palette, font, and base size.
- Installing dependencies that no 16A code imports (`lucide-react`, `sonner`,
  `@tanstack/react-table`, `react-dropzone`, `react-day-picker`, `shadcn`
  CLI). The ADR approves them; the change that first imports each adds it.

## Decisions

### D1. Theme file layout and selector structure

`src/theme.css` holds, in order:

1. `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));`
   so components may later use `dark:` without a build change.
2. `:root, :root[data-theme="light"] { ... }` with raw token values in OKLCH
   (the shadcn v4 convention). A comment marks where a `:root[data-theme="dark"]`
   block goes; no dark values ship.
3. `@theme { --color-*: initial; --font-*: initial; ... }` removing Tailwind's
   default color palette and font families, then `@theme inline { ... }` mapping
   `--color-<token>: var(--<token>)`, font, text scale, radius, shadow, and ease
   tokens into Tailwind's namespaces.

`src/styles.css` becomes the entry: `@import "tailwindcss"`, the Inter
fontsource import, `@import "./theme.css"`, and an `@layer base` block for
document defaults (body font/color/background at `text-sm`), a global
`:focus-visible` outline from `--ring`, and the reduced-motion override.

Alternatives: keeping `--lace-*` names (rejected: every generated shadcn
component would need renaming, defeating owned-source regeneration); a `.dark`
class selector (rejected in favor of `data-theme`, which admits more than two
themes and matches the spec's selector contract); HSL channels (rejected: shadcn
v4 and Tailwind 4 both default to OKLCH).

### D2. Token values

- Neutrals from shadcn's `neutral` base; `primary`/`ring`/`sidebar-primary` use
  indigo (`oklch(0.511 0.262 276.966)` primary, `oklch(0.585 0.233 277.117)`
  ring). `muted-foreground` is darkened to `oklch(0.5 0 0)` so it passes 4.5:1
  on both `muted` and `background` at 13px.
- Lace status pairs `success`/`success-foreground` and
  `warning`/`warning-foreground` (light fill, dark text) back Badge tones;
  `destructive-foreground` is kept for filled destructive surfaces.
- Text scale overrides Tailwind's names so shadcn class names keep meaning:
  `text-xs` 11px, `text-sm` 13px (body base), `text-base` 14px, `text-lg`
  16px, `text-xl` 18px, `text-2xl` 22px, `text-3xl` 28px, each with a line
  height. Headings use `text-xl`/`text-2xl` with `tracking-tight`.
- Spacing keeps Tailwind's single `--spacing: 0.25rem` base (declared
  explicitly). Radius: `--radius: 0.5rem` with `sm/md/lg/xl` derived
  (`calc(var(--radius) ± n)`). Shadows `xs/sm/md/lg` use neutral black at low
  alpha. Motion: `--duration-fast: 150ms`, `--duration-normal: 220ms`,
  `--ease-standard`; utilities use `duration-(--duration-fast)` and
  `ease-standard`.
- A vitest test parses the light token block, converts OKLCH to sRGB, and
  asserts 4.5:1 for every surface/foreground pair (spec: contrast scenario).

### D3. Class composition utilities

Add `clsx` + `tailwind-merge` as `cn()` in `src/components/cn.ts` (shadcn's
`lib/utils` equivalent; 16B moves it to `shared/lib`). Button and Badge
variants use `class-variance-authority` and export `buttonVariants` so the
shell's menu toggle no longer hand-copies button classes. Repeated screen
layouts (page column, page heading, form column, action row, status panel,
field wrapper, field error, native input/select/textarea, checkbox row) are
exported as utility-class recipes from `src/components/layout.ts` rather than
repeated inline across ~70 sites. Existing Button variant names
(`primary`/`secondary`/`quiet`) and Badge tones stay to avoid touching call
sites; shadcn names arrive with the 16B primitives.

Alternative: new layout components (`<Page>`, `<Actions>`). Rejected for 16A:
it restructures JSX across `app.tsx` right before 16B splits that file, and
16B's folder rules decide where such components live.

### D4. Mapping hand-written CSS

- Shell: sidebar uses `bg-sidebar text-sidebar-foreground border-r
  border-sidebar-border`, nav links use `aria-[current=page]:bg-sidebar-accent`
  and hover equivalents. Narrow-screen behavior moves from the `max-width:
  48rem` media block to `md:` variants plus `group-data-[nav-open=true]:` on the
  shell `group`; the breakpoint remains 48rem.
- ProseMirror: the editor root receives utilities through Tiptap
  `editorProps.attributes.class` (min height, no outline) instead of a
  descendant selector; the media preview `img` receives utilities directly.
- Radix state styling uses data-attribute variants
  (`data-[highlighted]:bg-accent`).
- `.lace-token-value` becomes `data-testid="issued-token-value"` plus
  utilities; the acceptance spec switches to `getByTestId`. Unused hook classes
  (`lace-publication-status`, `lace-draft-form`) are removed.

### D5. Raw-color lint gate

New `scripts/check-admin-colors.mjs` exporting `checkAdminColors(root)` and
invoked by root `lint` after the boundary check. It walks
`apps/admin/src/**/*.{ts,tsx,css}`, skipping `*.test.*`, `*.e2e.ts`,
`src/test/**`, and the allow-listed `src/theme.css`.

- TS/TSX: `createScanner` (JSX variant) yields string, template, and JSX text
  tokens; only their contents are checked, so private fields, identifiers, and
  comments cannot false-positive.
- CSS: comments stripped, then declaration values and `@apply` lines checked.
- Detectors: hex (`#` + 3/4/6/8 hex digits, not followed by a word char and
  not part of an identifier like `#root`), color functions (`rgb[a]`,
  `hsl[a]`, `hwb`, `lab`, `lch`, `oklab`, `oklch`, `color`, `color-mix`),
  CSS named colors (whole string value or CSS declaration value word), and
  Tailwind palette utilities (`<color-prefix>-<palette>[-<shade>]`, including
  variant prefixes and `/opacity`). Keywords `transparent`, `currentColor`,
  `inherit` are allowed.
- Output: `file:line: raw color literal "<text>"` for every hit, non-zero exit.
- Tests: `tests/admin-colors.test.mjs` with `tests/fixtures/admin-colors/`
  `allowed` (token utilities, `"#root"`, theme file with literals, a test file
  with literals) and `forbidden` (hex arbitrary value, palette class, `rgb()` in
  CSS, named color in a style object). The root `test` script excludes
  `tests/fixtures/**` so fixture files named like tests are never executed.

Alternatives: an Oxlint rule (Oxlint has no configurable literal-pattern rule
and custom JS plugins would add a new plugin surface); Stylelint (a new
toolchain AGENTS.md does not list); relying only on `--color-*: initial`
(catches palette classes silently but not hex/arbitrary values or inline
styles, and gives no error).

### D6. Architecture and ADR

§17 gains "Component source" and "Source layers" subsections; §19's admin list
adds the approved packages and replaces the "Tailwind and Radix" paragraph with
the owned-shadcn rule; §24 gains one decision bullet. ADR 0005 records context,
decision, consequences, and rejected alternatives (MUI/Mantine/Chakra themed
libraries, Radix Themes, shadcn as an npm dependency, Google Fonts CDN).

## Risks / Trade-offs

- [Class-string recipes drift from 16B components] → recipes are a single
  module 16B replaces when it generates primitives; tasks keep them small.
- [Tailwind default palette removal breaks a missed class silently] → the lint
  gate reports palette classes, and the full admin test suite plus e2e run.
- [Font size override surprises generated shadcn code] → documented in the
  ADR; `text-sm` intentionally becomes the 13px body size.
- [jsdom cannot evaluate Tailwind output for visual regressions] → behavior
  tests stay authoritative; manual check of the dev server screens before
  completion.
- [Hex detector misses a color written as a bare identifier] → CSS named
  colors are checked in declarations and whole-string values; residual gaps are
  accepted over false positives.

## Migration Plan

Pure client styling and tooling change; no data or API migration. Rollback is
reverting the commit. The acceptance e2e locator changes in the same commit as
the markup.
