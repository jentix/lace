## 1. Architecture and dependencies

- [x] 1.1 Update `docs/mvp-architecture.md` §17 "Source layers" (entry and test-file exceptions, unit definition for `app`/`shared`, relative imports, enforcement active) and §19 (Radix primitive packages, no animation plugin); verify no text still says enforcement starts in 16B
- [x] 1.2 Add catalog entries and admin dependencies for `lucide-react`, `sonner`, `react-day-picker`, and Radix `slot`, `dropdown-menu`, `popover`, `tooltip`, `tabs`, `scroll-area`; remove `@radix-ui/react-toast`; verify `pnpm install` updates the lockfile and `pnpm install --frozen-lockfile` succeeds

## 2. Boundary enforcement

- [x] 2.1 Implement `checkAdminStructure` in `scripts/check-boundaries.mjs` (layer classification, specifier resolution, unit/public-API rule, direction with entry/test/shared exceptions, component-folder rules) and call it from `checkBoundaries`; verify it reports the current flat admin source as outside the layers
- [x] 2.2 Add `tests/fixtures/admin-structure/*` roots and cases in `tests/boundaries.test.mjs` for allowed, upward, cross-slice, slice deep import, component deep import, incomplete component folder, misplaced component, missing slice index, outside-layer file, and test-file exception; verify `pnpm exec vitest run tests/boundaries.test.mjs` passes

## 3. Shared layer

- [x] 3.1 Move `admin-client.ts` (+test) and the error mapper into `shared/api` with `useAdminClient`, and `cn`/`safeReturnPath` into `shared/lib`; verify the moved client test passes
- [x] 3.2 Generate the 16 shadcn primitives with the pinned CLI, adapt them per design D4, and place each in `shared/ui/<Component>/` with `index.ts` and a focused test; verify the primitive tests pass and the color check reports nothing
- [x] 3.3 Add `TextField`, `LoadingState`, `EmptyState`, `ErrorState`, `PageState`, and `shared/ui/layout`, moving the relevant `components/ui.test.tsx` assertions into their tests; verify those tests pass

## 4. Entities and features

- [x] 4.1 Create `entities/session` (session sources, `useSession`, `useSessionSource`, `useSessionRecovery`, session test), `entities/media` (`MediaPreview` + test, media limits), and `entities/content` (form model + test, draft helpers, `RichTextEditor`, `FieldRenderer` registry with tests); verify their tests pass
- [x] 4.2 Create features `sign-in`, `sign-out`, `create-entry`, `delete-entry`, `publish-entry`, `upload-media`, and `delete-media` from the existing code with tests; verify their tests pass

## 5. Widgets, pages, and app

- [x] 5.1 Create widgets `admin-shell`, `collection-entries`, `block-editor`, and `media-library` from the existing code; verify their tests pass
- [x] 5.2 Move each route screen into its `pages/<route>/` slice without behavior changes, reading route state through `getRouteApi`; verify each page test passes
- [x] 5.3 Create `app/router` (route tree, `createAdminRouter`, `Register`), `app/AdminApp` (providers, Toaster, TooltipProvider), `app/styles` (styles, theme, theme test), and `app/testing`; point `main.tsx`, `vite`, and the color check at the new paths; delete `app.tsx`, `components/`, and the old flat modules; verify `pnpm --filter @lacecms/app-admin build` succeeds
- [x] 5.4 Split every `app.test.tsx` test into the unit test files per design D6 without weakening assertions; verify the admin suite passes with at least the previous 67 test cases represented

## 6. Browser tests

- [x] 6.1 Move `editor.e2e.ts` and `acceptance.e2e.ts` to `apps/admin/e2e/`, set `testDir: "./e2e"`, and include `e2e` in admin lint and typecheck; verify `pnpm --filter @lacecms/app-admin test:e2e` passes

## 7. Verification

- [x] 7.1 Verify the gate by temporarily adding an upward and a cross-slice import to admin source and confirming `pnpm lint` fails, then removing them
- [x] 7.2 Start the admin dev server and check login, content, a collection, the entry editor, and media render without console errors
- [x] 7.3 Run root `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, and `pnpm exec openspec validate m16b-admin-layered-structure --type change --strict`; verify all pass
