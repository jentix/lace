## Why

Roadmap Step 20, Session 20A (Login, users, and settings). Steps 17–19 rebuilt
the shell, collection lists, media library, and editor on the Lace design
system, but sign-in, Users, and Settings still use the Session 11–15 form
layouts: a bare heading over a form, native `<select>` role pickers with a
separate "Save role" button, `window.confirm` for disabling users and revoking
tokens, an inline plaintext token panel, ISO-derived `toLocaleString` dates,
and a not-found screen outside the shell with no way back. These are the last
admin routes that do not follow the redesigned patterns, and Session 20B's
accessibility and redesign acceptance cannot start until they do.

## What Changes

- Rebuild `/login` as a centered sign-in card on the shell's sidebar surface
  with the Lace mark, focused email field, password visibility toggle, a
  pending submit, and an inline sign-in error. Redirect behavior and the safe
  return location are unchanged.
- Rebuild `/users` as a page header with an account summary and a
  **Create user** dialog (email, password with its 12-character rule, and a
  role picker that describes each role), over a users table showing email with
  a "You" marker for the signed-in account, role and status badges, and
  per-row **Change role** and **Disable**/**Enable** actions. Each action opens
  a confirmation dialog; final-administrator rejections are explained inside
  the dialog and leave the confirmed state unchanged. The signed-in account is
  offered no Disable action, and demoting it is explicitly warned about.
  Successful mutations are announced through the Toaster.
- Rebuild `/settings` as status cards (API readiness, configured models,
  active build tokens) with a refresh action, over a build-token table with
  name, prefix, relative created and last-used times (absolute on hover), a
  status badge, and a confirmed **Revoke** dialog. Creating a token happens in
  a dialog whose second step shows the plaintext once with Copy and Done; the
  plaintext exists only in that dialog's state and is cleared when it closes
  or Settings unmounts.
- Add a protected catch-all route so an unknown admin path renders a
  not-found state inside the shell with breadcrumbs and a link back to
  Content; anonymous visitors to unknown paths go through the usual sign-in
  redirect. Invalid model keys keep their client not-found behavior.
- Make empty, loading, error, and access-denied states consistent: the shared
  error state gains a built-in "Try again" action used by every retryable
  screen, empty and not-found states gain an icon, and access denied links
  back to Content.
- Move role labels and descriptions into the session entity so the user menu,
  users table, and role pickers share one vocabulary.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `admin-users-and-settings`: user management moves to create/change-role/
  enable/disable dialogs with self-account protection and toast feedback;
  Settings gains status cards, relative token times, confirmed revocation,
  and a once-shown token dialog.
- `admin-application-shell`: the sign-in screen's presentation and error
  behavior; unknown admin paths render an in-shell not-found route; shared
  empty, loading, error, and access-denied states are consistent and
  retryable.

## Impact

- Architecture: §17 (Admin application — primary routes, shell, source
  layers) and §14 (roles; unchanged). §17 gains one paragraph describing the
  sign-in, Users, and Settings screens and the not-found route. No invariant
  changes.
- Code (`apps/admin/src`): `pages/login`, `pages/users`, `pages/settings`,
  `pages/not-found`, `features/sign-in`, new `features/create-user`,
  `features/update-user`, `features/create-build-token`, and
  `features/revoke-build-token` slices, `entities/session` (role vocabulary),
  `shared/ui` (`ErrorState`, `EmptyState`, `PageState`), `app/router` (catch-all
  route), `app/testing` (Toaster in the harness), `widgets/admin-shell`
  (not-found breadcrumb, shared role labels), and the existing retry call
  sites in `widgets/collection-entries` and `widgets/media-library`.
- Browser tests: `apps/admin/e2e/acceptance.e2e.ts` and `editor.e2e.ts` follow
  the dialog-based user and token flows.
- APIs, contracts, persistence, and dependencies: none. The existing user,
  settings-status, and build-token endpoints already support every action,
  including re-enabling a disabled user (`disabled: false`). Node and
  Cloudflare parity is unaffected.
- Non-goals: axe checks, keyboard walkthrough, narrow-screen audit, and legacy
  documentation cleanup (20B); the Builds screen (Step 21); password reset,
  user deletion, display-name editing, invitations, and session revocation;
  dark mode.
- Dependencies: Sessions 16B (layers, primitives), 17B (shell, breadcrumbs,
  user menu), and the relative-time helper from 17B.
