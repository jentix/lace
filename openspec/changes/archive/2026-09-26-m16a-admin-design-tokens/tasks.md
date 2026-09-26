## 1. Architecture and decision record

- [x] 1.1 Update `docs/mvp-architecture.md` §17 with "Component source" (shadcn on Radix as Lace-owned source, token-only styling, light theme with dark-ready `data-theme` structure) and "Source layers" (`app → pages → widgets → features → entities → shared`, no cross-slice imports, `index.ts` public API, PascalCase component folders with test and `index.ts`, enforcement in 16B); verify both subsections render and cite ADR 0005
- [x] 1.2 Update §19 admin dependencies (approved `lucide-react`, `sonner`, `@tanstack/react-table`, `react-dropzone`, `react-day-picker`, `@fontsource-variable/inter`, `clsx`, `tailwind-merge`, `class-variance-authority`; install-on-first-use rule) and add a §24 decision bullet; verify no remaining text claims Radix-only wrappers without shadcn
- [x] 1.3 Add `docs/adr/0005-admin-owned-component-source.md` with status, governing sections, context, decision, consequences, and rejected alternatives; verify it follows the ADR 0004 format and links resolve

## 2. Tooling and tokens

- [x] 2.1 Add catalog entries and admin dependencies for `@fontsource-variable/inter`, `clsx`, `tailwind-merge`, `class-variance-authority`; verify `pnpm install` succeeds with a frozen-compatible lockfile update
- [x] 2.2 Create `apps/admin/src/theme.css` with the `dark` custom variant, light token block under `:root, :root[data-theme="light"]`, default palette/font reset, and `@theme inline` mappings for color, font, text scale, spacing, radius, shadow, and ease tokens; verify `pnpm --filter @lacecms/app-admin build` succeeds
- [x] 2.3 Rewrite `apps/admin/src/styles.css` to only import Tailwind, Inter, and the theme and define base-layer document defaults, `:focus-visible` from `--ring`, and reduced motion; verify it contains no class selectors
- [x] 2.4 Add `apps/admin/src/theme.test.ts` asserting required token names exist, light is the default with no dark values, and every surface/foreground pair meets 4.5:1 contrast; verify the test passes

## 3. Utilities over tokens

- [x] 3.1 Add `src/components/cn.ts` and `src/components/layout.ts` recipes; rewrite `src/components/ui.tsx` with cva Button/Badge variants and utility classes for all owned controls; update `ui.test.tsx` token assertions; verify `ui.test.tsx` passes
- [x] 3.2 Replace every `lace-*` class in `src/app.tsx` (shell, navigation, narrow-screen menu, pages, forms, media, blocks, entry editor, users, settings) with utilities and recipes, switching the issued token to `data-testid="issued-token-value"`; verify `app.test.tsx` passes and `grep lace- src/app.tsx` finds no class names
- [x] 3.3 Restyle `rich-text-editor.tsx` (toolbar and Tiptap `editorProps.attributes.class`) and `media-preview.tsx` with utilities and update `acceptance.e2e.ts` to `getByTestId("issued-token-value")`; verify `media-preview.test.tsx` passes and no `lace-` class remains in admin source

## 4. Raw-color lint gate

- [x] 4.1 Implement `scripts/check-admin-colors.mjs` (TS scanner string/JSX-text checks, CSS declaration checks, hex/function/named/palette detectors, theme and test exemptions, `file:line` output) and add it to root `pnpm lint`; verify `node scripts/check-admin-colors.mjs` passes on the repository
- [x] 4.2 Add `tests/admin-colors.test.mjs` with `tests/fixtures/admin-colors/allowed` and `forbidden` trees covering hex arbitrary values, palette classes, CSS color functions, named colors in style values, `"#root"`, theme-file literals, and test-file exemption; verify `pnpm exec vitest run tests/admin-colors.test.mjs` passes

## 5. Verification

- [x] 5.1 Run the admin unit suite and the editor Playwright suite (`pnpm --filter @lacecms/app-admin test` and `test:e2e`) and verify all pass
- [x] 5.2 Start the admin dev server and visually check login, shell, content, and a narrow viewport render in Inter at 13px with indigo accent and working menu; verify no console errors
- [x] 5.3 Run root `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, and `pnpm exec openspec validate m16a-admin-design-tokens --type change --strict`; verify all pass
