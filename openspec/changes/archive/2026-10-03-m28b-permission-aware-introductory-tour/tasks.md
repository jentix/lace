## 1. Navigation-derived guidance and scoped records

- [x] 1.1 Add the shell slice's pure tour descriptor builder using `navigationGroups` and current role, with stable step IDs and role-specific Content/Pages/Collections/Media/Builds/Users/Settings copy. Verify focused unit tests cover all three roles, page-only/collection-only/empty/unavailable models, absence of unavailable action instructions, once-only published-read build tokens, and publication/site-update distinctions without mode assumptions.
- [x] 1.2 Add versioned whole-record local persistence scoped to origin, router admin base path, and user ID, with validated reads and document-lifetime fallback on unavailable/throwing storage. Verify unit tests for completion/dismissal, reload-style new helper instances, shell remount fallback, different users/origins/basepaths/versions, malformed records, read/write/access failures, and independent whole-record writes.

## 2. Optional tour and account-menu replay

- [x] 2.1 Add `IntroductoryTour` with its component/test/index folder, non-modal Start tour/Skip welcome, labelled scrollable Dialog, position, Back/Next/Finish, dismissal, and focus hooks. Verify component tests cover bounds, completion, Skip/close/Escape, replay reset, welcome without autofocus, accessible labels, and no mutation or URL change.
- [x] 2.2 Wire one protected-shell controller to the current session/models query and both account-menu instances; add Introduction to UserMenu and close the mobile sheet before opening the tour. Verify shell/menu/header tests for first-use/returning users, every role, desktop opener restoration, mobile visible-opener fallback, and availability without completing onboarding.
- [x] 2.3 Reconcile active steps by stable identity on model/role changes and reset transient progress on account changes/session loss. Verify integration/component tests for delayed/error/empty model reads, models resolving during Media, removal of the active model group, admin-to-viewer downgrade on Settings, identity switch, and sign-out, with no stale privileged copy or records written for the wrong user.
- [x] 2.4 Verify tour safety over the real entry screen with an unsaved draft and route search state. Add a regression test that opens/replays, advances/goes Back, and closes the tour while retaining all edited values and the URL, with zero mutation calls and no discard prompt.

## 3. Browser accessibility and onboarding documentation

- [x] 3.1 Add Playwright role-matrix/return-visit coverage for the first-use offer, Start/Skip, completion, persistence across reload, user isolation, and replay; verify admin/editor/viewer text and available steps, and ensure ordinary editorial scenarios still work without tour completion.
- [x] 3.2 Add browser keyboard, focus-containment/restoration, desktop/mobile overlay-handoff, 375px overflow, reduced-motion, and axe checks for the welcome and every tour step. Verify these tests plus existing `accessibility.e2e.ts` and `editor.e2e.ts` regressions pass with no global axe rule exclusions.
- [x] 3.3 Update README and `docs/auth-operations.md` with Start/Skip, account-menu Introduction, role differences, browser/user/address/version persistence, storage fallback, and no credentials stored; record the 28B onboarding-feedback result and future Step 29 text reconciliation. Verify links and instructions match the delivered UI and do not prescribe an unverified Astro restart or guarantee deployment on publish.

## 4. Final verification

- [x] 4.1 Run the full admin unit/component suite after focused tests, then root `pnpm typecheck`, `pnpm lint`, and `pnpm format:check`; resolve failures and verify no new dependency, migration, or boundary violation was introduced.
- [x] 4.2 Run `pnpm exec openspec validate m28b-permission-aware-introductory-tour --type change --strict`, inspect the final diff against the seven new requirements, and record actual successful commands/results in the change's verification record before reporting implementation complete.

The user's original request also authorizes synchronizing verified delta specs,
archiving the completed 28B change, and committing its files on the current
branch after successful implementation. Those lifecycle actions follow their
OpenSpec skills and are not evidence of implementation completion on their own.
