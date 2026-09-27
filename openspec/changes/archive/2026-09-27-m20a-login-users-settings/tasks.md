## 1. Shared vocabulary and states

- [x] 1.1 Add `entities/session/roles.ts` (`roleOptions`, `roleLabel`, `roleDescription`) exported from the slice index, switch `widgets/admin-shell/UserMenu` to it, and verify with a unit test plus the existing UserMenu tests
- [x] 1.2 Add `onRetry` to `ErrorState` and `icon` to `EmptyState`; give `PageAccessDenied` an icon and a "Go to Content" link; verify with their component tests
- [x] 1.3 Replace the hand-rolled "Try again" wrappers in `CollectionEntries`, `MediaLibrary`, and `MediaPickerDialog` with `ErrorState onRetry` (the compact `SelectedMedia` card keeps its inline retry), and verify their existing retry tests still pass
- [x] 1.4 Render the Toaster in the `app/testing` harness and verify a page test can find a raised toast

## 2. Sign-in and not-found

- [x] 2.1 Rebuild `LoginPage` as the centered sign-in card and add email autofocus, the password visibility toggle, and the in-card error to `SignInForm`; verify with SignInForm and LoginPage tests covering focus, toggle name and pressed state, rejection keeping the email, and return-location navigation
- [x] 2.2 Add the protected `$` catch-all route rendering `NotFoundPage` in the shell, map it to the "Page not found" breadcrumb, redesign `NotFoundPage` with the Content link, and keep the root fallback for malformed model keys; verify with AdminApp/router tests for signed-in unknown paths, anonymous redirect with return path, and `/content/INVALID`

## 3. Users

- [x] 3.1 Add `features/create-user/CreateUserDialog` with email, password rule hint, described role Select, in-dialog errors, and success toast; verify with a component test for success, failure keeping input, and cancel focus return
- [x] 3.2 Add `features/update-user` with `useUpdateUser`, `ChangeRoleDialog` (self-demotion warning, unchanged-role guard), `UserAccessDialog` (Disable/Enable), and the final-administrator error mapping; verify with component tests for role change, last-admin rejection keeping the dialog open, disable, and enable
- [x] 3.3 Rebuild `pages/users` with the header, account summary, `UsersTable` (You marker, role and status badges, row actions, no self-disable), and loading, retryable error, and empty states; invalidate session and router after self-demotion; verify with UsersPage tests including access denial without requests and expired-session recovery

## 4. Settings

- [x] 4.1 Add `features/create-build-token/CreateBuildTokenDialog` with the name step, once-shown plaintext step, Copy feedback, Done, outside-click protection, and state clearing on close; verify with component tests for issue, dismissal clearing the value, and creation failure
- [x] 4.2 Add `features/revoke-build-token/RevokeBuildTokenDialog` with confirmation, success toast, and in-dialog failure; verify with component tests
- [x] 4.3 Rebuild `pages/settings` with `SiteStatusCards` (readiness, models, active tokens, Refresh status) and `BuildTokenTable` (prefix, relative times with absolute titles, status badge, Revoke), plus loading, retryable error, and empty states; verify with SettingsPage tests including viewer denial without requests

## 5. Browser flows and documentation

- [x] 5.1 Update `apps/admin/e2e/acceptance.e2e.ts` and `editor.e2e.ts` for the dialog-based user creation and token issuance flows (plus the unknown-path check), and verify the editor Playwright suite and the local acceptance walkthrough (`pnpm acceptance:start` + `pnpm test:acceptance`) pass
- [x] 5.2 Add the sign-in, Users, Settings, and not-found paragraph to architecture §17, update the README build-token steps, and verify the text matches the delta specs
- [x] 5.3 Run admin tests, root typecheck, `pnpm lint` (Oxlint and boundaries), Oxfmt check, and `openspec validate m20a-login-users-settings --type change --strict`, and verify all pass
