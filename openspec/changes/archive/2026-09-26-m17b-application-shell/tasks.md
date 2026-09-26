## 1. Shared and entity foundations

- [x] 1.1 Add `formatRelativeTime` to `shared/lib` with unit tests for seconds through years, future values, and the "now"/"yesterday" auto phrasing; verify with the focused vitest run
- [x] 1.2 Add `limit` to `EntryListQuery`, `adminQueryKeys.entryOverview` and `adminQueryKeys.modelEntries`, and cover the `limit` query string and key prefixes in `admin-client.test.ts`
- [x] 1.3 Switch create-entry, delete-entry, and entry save/publish invalidations to `modelEntries(modelKey)` and verify existing feature and page tests still pass
- [x] 1.4 Extend `AdminSession` with optional `displayName` parsed from `user.name` then `user.email`, never from the ID; verify in `session.test.ts` (name, email fallback, neither)
- [x] 1.5 Add `useEntryOverview` and the `EntryStatusBadge` component folder to `entities/content`; verify the badge test covers draft, published, and changed labels

## 2. Application shell widget

- [x] 2.1 Rewrite `widgets/admin-shell/navigation.ts` as pure `navigationGroups(role, models)` and `breadcrumbsFor` functions with unit tests for role matrices (Admin group omitted for editor/viewer), empty groups, page vs collection crumbs, and neutral fallbacks
- [x] 2.2 Build `SidebarNav` (brand, grouped icon navigation, collection counts with accessible names, page singleton links, current-location marking, loading and failure tolerance) with a component test (including a failed count not blocking route content and the missing-singleton link)
- [x] 2.3 Build `UserMenu` (display name or neutral label, role, log out item with pending state) with a test proving no ID is rendered and logout clears the session
- [x] 2.4 Build `ShellHeader` (Open navigation sheet trigger, sheet with `SidebarNav`, breadcrumbs) with tests for breadcrumb links/current page, entry-title loading fallback, sheet close on navigation, and focus return on Escape
- [x] 2.5 Rebuild `AdminShell` as the inset-panel layout with skip link, desktop aside, header, `main#main-content`, and sign-out error display; update `AdminShell.test.tsx` for the role matrix, skip link, and failed logout, and prove count refresh after entry creation in `CreateEntryDialog.test.tsx`

## 3. Content overview

- [x] 3.1 Rebuild `pages/content/ContentPage` with Pages and Collections sections, page cards (status badge, relative edit time, editor display name, singleton link, missing-draft guidance, per-card error) and collection cards (totals and per-status counts); update `ContentPage.test.tsx` for the spec scenarios including one failing model and a viewer session

## 4. Existing tests, docs, and verification

- [x] 4.1 Update `AdminApp.test.tsx`, `LoginPage.test.tsx`, and other tests that used the header "Log out" button or ambiguous link names to use the user menu and scoped queries; verify `pnpm --filter @lacecms/app-admin test` passes
- [x] 4.2 Update `apps/admin/e2e/editor.e2e.ts` for "Open navigation" and verify the Playwright suite passes (including the 375px no-horizontal-scroll check)
- [x] 4.3 Add the shell navigation-group sentence to architecture §17 and verify the text matches the implemented groups
- [x] 4.4 Run root typecheck, Oxlint (including boundary and color checks), Oxfmt check, and `openspec validate m17b-application-shell --type change --strict`; verify all pass
