## 1. Foundations

- [x] 1.1 Pin `@tanstack/react-table` 9.2.4 in the pnpm catalog, add it to `@lacecms/app-admin`, and verify `pnpm install` resolves it and the admin typecheck passes
- [x] 1.2 Add `formatDate` (UTC calendar date) to `shared/lib` with unit tests for ISO datetimes, `YYYY-MM-DD` values, and invalid input
- [x] 1.3 Replace `adminQueryKeys.entries` with `entryList(modelKey, query)` under the `modelEntries` prefix and cover the key shape and prefix in `admin-client.test.ts`
- [x] 1.4 Add `parseCollectionSearch` and `validateSearch` to the collection route (trimmed bounded `q`, known `status`/`sort`, default sort dropped, `SearchSchemaInput` so links need no search) with unit tests for valid, invalid, blank, over-long, and default values

## 2. Dialogs

- [x] 2.1 Restyle `CreateEntryDialog` (icon trigger, description naming the collection, autofocused title, blank-title guard, trimmed submit, Cancel, reset on close) and verify its tests cover blank title, cancel, success refresh, and error-in-dialog
- [x] 2.2 Restyle `DeleteEntryDialog` (icon trigger named "Delete {title}", destructive confirmation, Cancel, error kept in dialog, `onDeleted` callback) and verify its tests cover cancel without request, confirmed deletion, and failure

## 3. Collection list widget

- [x] 3.1 Add pure `listFieldColumns`/`formatListValue`/sort-mapping helpers and the `EntryListTable` component (TanStack Table columns) with tests for list-field labels and key fallback, every scalar type, missing values, sort mapping, and the manager-only actions column
- [x] 3.2 Rebuild `CollectionEntries` on TanStack Table with manual sorting, the toolbar (debounced search, status filter with totals, clear filters), states (skeleton, empty with create action, no matches, error with retry, next-page error, busy placeholder rows), "Showing N of M" with Load more, and heading focus after deletion; rewrite `CollectionEntries.test.tsx` for the spec scenarios including viewer parity and absence of entry and user IDs
- [x] 3.3 Wire `ModelPage` to pass route search and a replacing navigate to the widget and verify in `ModelPage.test.tsx` that opening a URL with `q`, `status`, and `sort` restores the controls and API query, that a filter change updates the URL, and that unsupported parameters are ignored

## 4. Existing tests, docs, and verification

- [x] 4.1 Update `CreateEntryDialog.test.tsx` and any other tests using the old "Delete"/"Confirm deletion" names; verify `pnpm --filter @lacecms/app-admin test` passes
- [x] 4.2 Update the Playwright specs if they touch changed controls and verify `pnpm --filter @lacecms/app-admin test:e2e` passes, including the narrow-viewport no-horizontal-scroll check
- [x] 4.3 Add the collection-list sentence to architecture §17 and verify it matches the implementation
- [x] 4.4 Run root typecheck, Oxlint (boundaries and color checks), Oxfmt check, and `openspec validate m17c-collection-list --type change --strict`; verify all pass
