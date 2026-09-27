## 1. Token-bypass lint

- [x] 1.1 Extend `scripts/check-admin-colors.mjs` with the arbitrary font-size, radius, shadow, focus-width, and motion patterns (allowing `var(` references and `rounded-[inherit]`), add forbidden and allowed fixtures, and verify `tests/admin-colors.test.mjs` covers each pattern and the layout-value exemptions
- [x] 1.2 Add `--radius-xs` to the theme and replace the existing bypasses in `shared/ui/Calendar`, `shared/ui/Tooltip`, and `pages/entry/EntryEditorActions`; verify `pnpm lint` passes for the repository and the affected component tests pass

## 2. Accessibility suite

- [x] 2.1 Add `@axe-core/playwright` 4.13.0 to the catalog and admin dev dependencies, add `e2e/support/accessibility.ts` with the fixed WCAG tags and a readable violation report, and make `playwright.config.ts` run every non-acceptance suite; verify `pnpm install` succeeds and `playwright test --list` lists both default suites
- [x] 2.2 Add `e2e/accessibility.e2e.ts` with a route-wide API mock and audits of sign-in, content home, collection list, page and collection entry editors, media library, Builds, Users, Settings, access denied, and not found; verify the audits run and pass
- [x] 2.3 Audit the add-block menu, media picker, publication confirmation, create-user dialog, and both build-token dialog steps while open; verify the audits run and pass
- [x] 2.4 Fix every violation the audits report in the component that owns it, and verify the affected component tests and the accessibility suite pass

## 3. Keyboard and narrow screens

- [x] 3.1 Add the keyboard-only walkthrough (sign in, sidebar to collection, open entry, add block, `Ctrl+S`, publish and confirm, open and dismiss Create user) with the `tabTo` helper and visible-focus checks; verify it passes
- [x] 3.2 Add the 375px checks: no horizontal scroll on every route, and the editor's Publication and Fields cards below the last block and after it in tab order; verify they pass

## 4. Local acceptance and documentation

- [x] 4.1 Add accessibility audits to `acceptance.e2e.ts` at content home, collection list, entry editor, media library, Users, and Settings, then run `pnpm acceptance:start` + `pnpm --filter @lacecms/app-admin test:acceptance` + `pnpm acceptance:stop` and verify the walkthrough passes without fixture edits
- [x] 4.2 Confirm no admin source is outside the layers (no `app.tsx` or `components/ui.tsx`; boundary check passes), update architecture §17 and §19 and the README acceptance and verification sections, and verify the text matches the delta specs
- [x] 4.3 Run the admin unit tests, the default Playwright suites, root tests for the lint script, root typecheck, `pnpm lint`, Oxfmt check, and `openspec validate m20b-redesign-acceptance --type change --strict`, and verify all pass
