## Context

See proposal.md — Why. The admin already has the layered source structure
(`app → pages → widgets → features → entities → shared`), the shadcn/Radix
primitives (Dialog, Select, DropdownMenu, Badge, Table, Toaster), the shell
with breadcrumbs and a header-actions slot, and `formatRelativeTime` /
`formatAbsoluteTime`. The Users and Settings pages still hold every mutation,
form, and table inline in one component, and use native `<select>` and
`window.confirm`. The API already supports every action the screens need:
`GET/POST /api/v1/admin/users`, `PATCH /api/v1/admin/users/:id` with `role`
and/or `disabled` (both directions), `GET /api/v1/admin/settings/status`, and
`GET/POST/DELETE /api/v1/admin/api-tokens`. The `ManagedUserDto` carries
`id`, `email`, `role`, and `disabled` only.

## Goals / Non-Goals

**Goals:**

- Move each user and token mutation into its own feature slice with its
  dialog, so pages only compose tables, headers, and states.
- Keep every remote-state rule from the accepted specs: success only after
  API confirmation, confirmed state retained on failure, plaintext token
  never cached.
- One shared vocabulary for roles and one shared retryable error state.

**Non-Goals:**

- Contract or server changes (no display name on managed users, no
  last-sign-in time, no user deletion).
- Accessibility automation and narrow-screen audit (20B).

## Decisions

### Slices

- `features/create-user/CreateUserDialog` — trigger button plus dialog; owns
  its email/password/role state and the `createUser` mutation.
- `features/update-user/` — `ChangeRoleDialog` and `UserAccessDialog`
  (Disable or Enable, chosen by the account's current state) plus a
  `userUpdateErrorDescription` mapper that turns `LAST_ADMIN_PROTECTED` into
  the final-administrator sentence. Both dialogs share one mutation hook
  (`useUpdateUser`) because they call the same endpoint and invalidate the
  same key.
- `features/create-build-token/CreateBuildTokenDialog` — two-step dialog.
- `features/revoke-build-token/RevokeBuildTokenDialog`.
- `pages/users/UsersTable` and `pages/settings/{SiteStatusCards,BuildTokenTable}`
  are page-local components (like `pages/entry/*`); they are not reused, so no
  widget slice is introduced.
- `entities/session/roles.ts` exports `roleOptions`, `roleLabel`, and
  `roleDescription`; `widgets/admin-shell/UserMenu` switches to it. A
  `RoleSelect` component in the same slice is shared by Create user and Change
  role; it lists role labels and describes the chosen role beneath the
  trigger, because Radix Select renders an item's whole content as its value.

Alternative rejected: one `features/manage-users` slice for every user
action. Separate create and update slices keep each slice's public API to one
concern and match the existing `create-entry`/`delete-entry` split.

### Row actions are dialog triggers, not a menu

Each row renders small outline buttons (`Change role`, `Disable`/`Enable`)
whose accessible names include the email (for example
`Change role for editor@lace.test`). Each button is its dialog's
`DialogTrigger`, so Radix returns focus to it on close without extra code.

Alternative rejected: a per-row DropdownMenu that opens controlled dialogs.
With only two actions it adds a click, and controlled dialogs opened from menu
items need manual focus restoration to the menu trigger.

### Role change is explicit, not on select

Change role uses a Radix Select inside a dialog, preselected with the
confirmed role, and Save is disabled until the choice differs. Picking a role
in the table itself and sending it immediately was rejected: a mis-click could
demote an administrator without a confirmation step, and reverting a Select
after a failed request is harder to follow than an error in an open dialog.
Self-demotion shows a warning inside the dialog; after a confirmed
self-demotion the page calls `sessionSource.invalidate()` and
`router.invalidate()` so the route guard re-reads the session and shows
access denied.

### Self-disable is not offered

The UI hides Disable on the row whose `id` equals the session `id`, because
the API permits disabling oneself when another admin exists and the result is
an immediate lockout. This is a UI affordance only; the API remains the
authority.

### Feedback through the Toaster

Create, role change, enable, disable, and revoke success raise a `toast`
naming the account or token ("Created editor@lace.test.", "Revoked
acceptance-site."). The dialogs close on success, so an inline status line
would have no stable place. `app/testing` renders the Toaster beside the
router so page tests can assert the text. Errors never go to toasts: they stay
in the dialog (mutations) or the page (reads).

### The plaintext token lives in the dialog only

`CreateBuildTokenDialog` keeps `issued: BuildTokenCreatedDto | undefined` in
component state. The mutation's `mutationFn` awaits `createToken` and writes
the result straight into that state, resolving with no data, so the mutation
cache never holds the plaintext; only the token list query is invalidated. Closing the dialog (Done, Escape, or unmount) clears `issued` and
the name. While `issued` is set, `onInteractOutside` is prevented so a stray
click cannot lose the value; Escape still closes because it is deliberate.
Copy uses `navigator.clipboard.writeText` and reports "Copied" or "Copy
failed — select the token manually" in a polite status next to the button.

### Status cards

`SiteStatusCards` renders three cards from two queries: readiness and model
count from `settingsStatus`, active tokens from the already-loaded token
list. Each card has its own loading placeholder and the readiness query's
error renders one shared error with Try again. Refresh status refetches
`settingsStatus` only.

### Not-found as a protected catch-all

A splat route (`path: "$"`) under `_protected` renders `NotFoundPage` in the
shell. Unknown paths therefore pass the protected guard: anonymous visitors
get the normal sign-in redirect and return, and signed-in visitors keep their
navigation. `breadcrumbsFor` maps `/_protected/$` to "Page not found". The
root `notFoundComponent` stays as the fallback for `notFound()` thrown by
route param parsing (malformed model keys) so that behavior is unchanged.
`NotFoundPage` itself no longer wraps its content in a `<main>`, since the
shell provides it; the root fallback wraps it.

Alternative rejected: relying on TanStack's fuzzy not-found handling on the
pathless protected route. Its behavior for pathless layouts is not part of
the router's documented contract, while a splat route is explicit and
testable.

### Consistent states

- `ErrorState` gains `onRetry?: () => void` rendering a "Try again" outline
  button inside the alert. The three existing hand-rolled "Try again"
  wrappers (collection entries, media library, media picker dialog) switch to
  it. The selected-media field card keeps its compact inline retry because it
  is a field value, not a screen state.
- `EmptyState` gains `icon?: LucideIcon`, rendered decoratively.
- `PageAccessDenied` gains an icon and a "Go to Content" link;
  `NotFoundPage` uses the same layout.

### Sign-in

`LoginPage` renders a full-height `bg-sidebar` surface with a centered card
(`bg-card`, border, shadow token). `SignInForm` gains `autoFocus` on email and
a `PasswordField` in `shared/ui` (Create user reuses it, and feature slices
cannot import each other): an `Input` with an icon button
toggling `type` between `password` and `text`, `aria-pressed`, and the name
"Show password"/"Hide password". The error renders inside the form above the
submit button.

## Risks / Trade-offs

- [Radix Select in jsdom lacks pointer APIs] → tests open it with the keyboard
  (as the existing FieldControls tests do) and the Playwright acceptance flow
  clicks the trigger and the option by role.
- [Toasts auto-dismiss before a slow assertion] → tests assert with
  `findByText` immediately after the action; the acceptance e2e asserts the
  refreshed table row instead of the toast.
- [Self-demotion leaves a stale session role until the guard re-reads it] →
  the page invalidates the session source and router after confirmation; the
  API rejects any further admin request regardless.
- [Catch-all changes anonymous unknown-path behavior from an immediate
  not-found to a sign-in redirect] → intended: it avoids revealing the admin
  route map to anonymous visitors and returns them to the same path after
  sign-in.

## Migration Plan

Frontend-only. No data or configuration migration. Rollback is a revert of
the admin source and e2e changes.
