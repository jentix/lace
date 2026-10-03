## Context

See proposal.md for motivation and authority references. The current branch is
`codex/step-28-first-admin-setup`; there are no other active changes. Session 28A
is already archived. `AdminShell` renders the protected outlet; `SidebarNav`
and `ShellHeader` share the models query. `navigationGroups(role, models)` in
`widgets/admin-shell/navigation.ts` omits empty model groups and limits Users/
Settings to admins. The session DTO carries user ID and role, not a permission
array. Entry/media/build/management screens use the fixed MVP role policy.
`UserMenu` is rendered in both desktop navigation and the mobile sheet.

Shared Dialog already supplies Radix focus containment and Escape; the app's
tokens and global reduced-motion rules govern styling. Existing browser tests
audit routes and dialogs using mocked APIs; their ordinary editorial scenarios
must continue to run without having to finish onboarding.

## Goals / Non-Goals

**Goals:** introduce actual navigation and role capabilities, isolate local
records, make replay safe over unsaved work, and verify the tour as part of the
existing accessible shell.

**Non-Goals:** extra permission contracts, server persistence, identity-freshness
polling, tour dependencies, content mutations, automatic navigation, or a
deployment-mode contract before Step 29.

## Decisions

### Keep the guide within the shell slice

Add a pure `tour.ts` step builder and `tour.test.ts`, a scoped persistence helper
and tests, and an `IntroductoryTour/` component folder with test and index inside
`widgets/admin-shell`. `AdminShell` owns one controller and one welcome/tour
instance; callbacks flow through SidebarNav/ShellHeader to UserMenu. Existing
entities/session and shared/api query keys provide inputs. No sibling widget
imports or upward runtime imports are needed, and new component folders obey
the enforced public-index convention. React component state owns transient
progress; no extra provider/state package is needed.

An independent feature slice importing the widget's navigation projection would
break the layer direction. Moving domain-aware navigation into shared would
misplace responsibility; keeping the guide in the existing shell avoids both.

### Use a non-modal invitation and an explicit dialog sequence

Render a small named welcome section before the route outlet only for unseen
scopes. It offers Start tour and Skip without focus movement. Start/replay opens
a compact dialog whose named steps are Content, Pages if available, Collections
if available, Media, Builds, Users if allowed, and Settings if allowed. Content
contains draft/publication guidance; Settings includes build tokens. Back is
disabled at the first step; Next becomes Finish at the last step. Skip, close
button, outside dismissal, and Escape all record dismissal. Finish records
completion. Replays do not clear an existing record merely by opening.

No step contains a route-changing action or mutation. Human route labels and
configured model labels may illustrate guidance without exposing internal IDs.
This keeps the guide independent of unsaved-draft blockers and singleton lookup
failures. Anchored spotlight libraries and forced navigation were rejected:
they complicate mobile focus, empty models, and in-progress editing.

### Derive steps from the existing navigation and current role

Build descriptors from `navigationGroups` and the same models query, reusing its
group membership rather than hardcoding another list of visible routes. Content
overview always exists. Pending/error reads supply no model-group steps; common
resource steps still work. Existing role rules determine writer versus viewer
copy and admin-only mutation descriptions. This is UI guidance only; server
authorization stays unchanged.

Use stable step IDs rather than an array index as active state. On model/role
changes derive permitted descriptors at render time, retaining the active ID if
valid or falling back to the first available step. Never render stale privileged
copy for an updated role. Key/reset the controller by installation and user
identity; role is deliberately not part of persistence identity. A role change
does not repeatedly invite a returning user but replay uses the new role. The
current session source is cached until invalidated; this change responds to
resolved session changes, without promising live server-side role detection.

### Store only versioned local status

Use a key such as `lace:introduction:v1:<encoded-origin>:<encoded-basepath>:
<encoded-user-id>` (one actual string without whitespace). Derive origin/base
path from the browser and the configured router basepath, never from arbitrary
current nested route paths. Read a validated small record with version and status
`completed` or `dismissed`; invalid or unexpected values are unseen. Encode key
parts unambiguously; never persist name, email, role, model data, or credentials.
One `setItem` writes the whole record; no database transaction is involved.

Wrap both localStorage acquisition and every read/write in exception handling.
Maintain a module-level map keyed by the same scope for the current document,
including when storage is unavailable. Update the map on completion/dismissal
even if the durable write fails. Storage success takes precedence for normal
reload behavior; the fallback suppresses repeat offers across router/shell
remounts within the document. Tests inject storage and scope instead of relying
on global browser state. Clearing browser storage or using another device resets
the durable experience. Replacing a database behind the exact same origin/base
path and same user ID is indistinguishable; no installation ID API is introduced.

No cross-tab step synchronization is needed: whole-record last writer wins,
both valid statuses suppress future offers, and an already-open tab may remain
open. A later user action/reload observes current storage. Server-backed user
preferences were rejected because they introduce migration/API work for a
small browser preference.

### Manage overlay handoff and focus explicitly

For desktop replay, close DropdownMenu before opening Dialog; keep a reference
to its visible account trigger for close-focus restoration. For mobile replay,
request sheet closure, allow its close/focus lifecycle to finish, then open the
single shell-level Dialog. Restore focus to Open navigation after closing. Use
the dialog's open/close autofocus hooks and a visible fallback when an opener
unmounts; do not restore focus into a closed sheet. First-use Start tour remains
a valid opener until completion/dismissal removes the welcome, after which the
visible account trigger or navigation opener is the fallback.

Focus the step heading on step changes, include position/total in its accessible
announcement, and retain visible keyboard focus for actions. Set a viewport-
bounded max height and overflow scrolling, wrap controls on narrow screens,
style only with tokens, and avoid custom motion. Existing Dialog primitives
remain unchanged unless a focused defect is demonstrated during verification.

### Keep publication copy within accepted behavior

Describe draft isolation and admin publication from `admin-draft-editor`, and
queued/pending/running/succeeded/failed build inspection from `site-build-dispatch`.
Editors/viewers learn what they can inspect without instructions to publish or
request/retry. Token guidance says published-export read only and shown once.
Do not infer static/manual/dev/automatic mode from role or history. Use neutral
copy about the site's rendering/build setup; Step 29 must revisit this text with
its verified mode contract. No unconditional restart or deployment promise.

## Risks / Trade-offs

- Local-only persistence → document browser/device scope, clearing behavior,
  fallback, and identical-address installation replacement limitations.
- Duplicate account menus and nested overlays → one controller, explicit mobile
  sheet handoff, and browser focus tests at desktop and 375px.
- Dynamic models/role remove an active step → stable IDs and render-time filtering,
  tested with delayed reads and role downgrade.
- Tour copy drifts from action permissions → role-matrix tests and derive visible
  groups from the sidebar projection; Step 29 copy reconciliation is explicit.
- Existing tests assume a clean route → the welcome is non-modal and never
  autofocuses; seed returning-user markers only where a fixture needs one.

## Migration Plan

Ship with the admin bundle on both Node and Worker; no API, SQL migration,
dependency, or secret changes. Document Start/Skip and account-menu Introduction
in README and `docs/auth-operations.md`. Run focused tests, the full admin
component suite, relevant Playwright keyboard/axe/mobile regressions, root
typecheck/lint/format checks, and strict change validation. Only after successful
apply verification synchronize the new capability, archive the completed change,
and commit the 28B files on the current branch under the user's request. Rollback
is the prior admin bundle; unused local markers do not affect authorization.
