# 28B verification

Implemented on `codex/step-28-first-admin-setup`. The browser-admin bundle is
shared by Node and Worker; this change adds no runtime-specific API, SQL schema,
permission, dependency, or deployment-mode contract.

## Completed checks

- `pnpm --filter @lacecms/app-admin exec vitest run src/widgets/admin-shell`:
  9 files / 30 tests passed before the additional pending/error integration case.
- `pnpm --filter @lacecms/app-admin test`: 114 files / 352 tests passed,
  including that case and the existing editor/shell suites.
- `pnpm --filter @lacecms/app-admin exec playwright test tour.e2e.ts --workers=2`:
  7 passed. Audits cover the welcome and every available step for each role;
  mobile keyboard, reduced motion, focus containment/restoration, replay,
  persisted completion/dismissal, user isolation, denied storage, anonymous
  entry, and unsaved-draft/no-mutation behavior all passed.
- `pnpm --filter @lacecms/app-admin exec playwright test accessibility.e2e.ts editor.e2e.ts --workers=1`: 25 passed, including keyboard drag reordering and existing route/dialog audits.
- After a final malformed-record handling correction,
  `pnpm --filter @lacecms/app-admin exec vitest run src/widgets/admin-shell/tour-storage.test.ts`:
  4 passed, including corruption after a previously valid record. A malformed
  JSON record is unseen, while actual storage failures use document memory.
- `pnpm typecheck`: passed, including root configuration typecheck.
- `pnpm lint`: passed, including package boundaries and admin design tokens;
  admin has zero warnings/errors. Four existing `no-new-array` warnings in
  `packages/db/src/index.test.mjs` were replayed from unchanged cached checks.
- `pnpm format:check`: passed.
- `pnpm exec openspec validate m28b-permission-aware-introductory-tour --type change --strict`:
  passed.
- `git diff --check`: passed.

## Review against requirements

All seven requirements are implemented: non-modal optional first-use invitation;
navigation/role-derived steps; bounded controls/replay without navigation or
mutations; isolated versioned local records with storage fallback; dynamic
model/role reconciliation and identity remount; focus-safe accessible dialog and
mobile overlay handoff; publication guidance that does not assume a site mode.

The implementation uses the existing Radix Dialog, Button, and DropdownMenu.
No spotlight library or automatic navigation was added. Role changes are honored
when the existing session source resolves a new session; live server-side role
polling remains outside the change. Records are local to origin/basepath/user/
version, and cannot distinguish replacing an installation at the same address
with the same user ID. README and auth operations document that limit. Step 29
must reconcile tour text with its verified mode-specific instructions.

## Test-run observations

The initial new browser run identified whitespace in accessible heading names
and an incomplete mocked entry DTO; both were corrected and all 7 tests passed.
The initial parallel existing browser run passed 24/25 tests, with a timing failure
in dnd-kit keyboard reordering (position announcement remained at 2). The same
unchanged test passed in isolation. The sequential full regression rerun passed all 25 tests and verified
that scenario alongside the other accessibility/editor tests.

## Spec lifecycle

All 7 requirements and Purpose were synchronized to `admin-introductory-tour`,
then compared against the delta. `pnpm exec openspec validate --specs --strict
--no-interactive` passed all 51 main capabilities; the change also passed strict
validation again. All 11 tasks were complete before archive.
