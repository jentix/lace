## Why

Roadmap Step 28, Session 28B addresses onboarding feedback §6: after signing in,
users have no introduction to the workflows their role can actually use. With
28A browser setup delivered, a dismissible guide can explain the existing admin
without making onboarding a prerequisite for editorial work.

## What Changes

- Offer a non-blocking welcome panel on first authenticated use with Start tour
  and Skip. Present a short optional dialog tour with Back, Next, Finish, and
  Close/Escape, plus an Introduction replay action in the account menu.
- Derive Pages/Collections steps from the same navigation projection as the
  sidebar. Explain draft editing and media upload only to writers; publishing,
  build request/retry, Users, Settings, and build-token creation only to admins.
  Viewers receive read-only guidance.
- Store completed/dismissed state in browser local storage, scoped to origin,
  admin base path, user ID, and tour version. No cross-browser synchronization;
  clearing storage resets the offer. Fall back to memory for the current page
  lifetime if storage is missing or throws. Never store credentials or content.
- Preserve keyboard focus, reduced motion, narrow layouts, model loading/error/
  empty states, and session/role changes. The tour does not navigate or mutate
  content, so opening it cannot discard an unsaved draft.
- Explain that saving a draft, publishing content, and updating the served site
  are distinct. Describe existing build status without assuming a deployment
  mode or prescribing a restart; Step 29 owns verified mode-specific guidance.

## Capabilities

### New Capabilities

- `admin-introductory-tour`: Permission-aware optional introduction, per-user
  browser persistence, replay, resilient lifecycle, and accessibility.

### Modified Capabilities

None. The new capability extends shell behavior without replacing accepted
navigation, route guards, or existing dialog/audit requirements.

## Impact

Implementation stays in `apps/admin`: the `widgets/admin-shell` slice owns tour
composition, navigation-derived steps, and account-menu wiring; the existing
session/content entities and shared Dialog/Button primitives are reused.
Focused unit/component tests and Playwright/axe coverage exercise all roles and
return visits. Update README and `docs/auth-operations.md` with replay and the
local persistence limits. No new dependencies, API, migration, or server writes.

Authority references: architecture §4.8 (workflow), §6 (dependency boundaries),
§14 (authorization), §17 (admin layers, UI, accessibility), and §20 (testing);
accepted `admin-application-shell`, `admin-draft-editor`, `admin-media-library`,
`admin-users-and-settings`, `authentication-and-actor-boundary`, and
`site-build-dispatch` specs. Dependencies are completed Steps 26–27 and 28A.
Non-goals include implementing Step 29, changing permissions or auth freshness,
server-backed onboarding records, anchored spotlight overlays, automatic route
walkthroughs, and credential creation from inside the tour.
