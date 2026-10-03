## MODIFIED Requirements

### Requirement: Session guards prevent protected-content flashes
Before rendering a protected route or protected navigation affordance, the
admin application SHALL resolve the current same-origin browser session. While
that resolution is pending, it SHALL render only a neutral loading state. When
there is no valid session, it SHALL read installation setup state and redirect to
`/setup` while incomplete or `/login` while complete, retaining a safe post-login
return location; a failed state read SHALL show a retryable sanitized error
without rendering protected content; it SHALL not briefly render protected route content
or actions. An authenticated visitor to `/login` SHALL be redirected to the
safe content landing route.

#### Scenario: An anonymous visitor opens a protected entry URL
- **WHEN** a browser without a valid session opens `/content/posts/entry-123`
- **THEN** it sees no entry content or protected controls and is redirected to
  setup while installation setup is incomplete, or the login route after
  completion, with a safe return location

#### Scenario: A session is still being checked
- **WHEN** a browser opens a protected route and session resolution has not
  completed
- **THEN** it sees a neutral loading state and no protected route content or
  navigation affordance

### Requirement: Admin entry redirects to the content home
The admin application SHALL redirect the `/admin/` entry path to `/admin/content` and apply the usual session guard before showing protected content.

#### Scenario: Anonymous visitor opens admin entry
- **WHEN** an unauthenticated visitor opens `/admin/`
- **THEN** the visitor reaches setup while installation setup is incomplete, or
  sign-in after completion, with a safe return location and sees no protected
  content

#### Scenario: Authenticated visitor opens admin entry
- **WHEN** an authenticated visitor opens `/admin/`
- **THEN** the visitor reaches the content landing screen

#### Scenario: A completed installation opens setup directly
- **WHEN** an anonymous visitor opens `/admin/setup` after installation completion
- **THEN** the visitor reaches sign-in with no setup form and no registration action

#### Scenario: Setup state cannot be read
- **WHEN** an anonymous entry or setup navigation cannot read installation state
- **THEN** a sanitized retryable error appears without setup fields or protected content

### Requirement: Every admin route passes automated accessibility checks
The browser test suite SHALL run an automated accessibility audit using the
WCAG 2.0, 2.1, and 2.2 level A and AA rules against every admin route once it
has finished loading: setup, sign-in, the content home, a collection list, the entry
editor for a page and for a collection entry, the media library, Builds,
Users, Settings, the access-denied state, and the not-found route. It SHALL
also audit the main dialogs while they are open: the add-block menu, the media
picker, the publication confirmation, the create-user dialog, and the
build-token dialog including its once-shown token step. Any violation SHALL
fail the suite and report the rule and the affected elements. No rule SHALL be
disabled globally; a rule MAY be excluded only for a named third-party element
with a recorded reason.

#### Scenario: A route is audited
- **WHEN** the accessibility suite opens an admin route and its loading state
  has resolved
- **THEN** the audit reports no WCAG A or AA violation for that route

#### Scenario: A dialog is audited
- **WHEN** the suite opens one of the main dialogs
- **THEN** the audit of the page with the dialog open reports no WCAG A or AA
  violation

#### Scenario: A violation is introduced
- **WHEN** an admin route renders a control without an accessible name or text
  below the required contrast
- **THEN** the accessibility suite fails and names the rule and the element

### Requirement: Unknown admin paths render a not-found route in the shell
Any admin path that matches no admin route SHALL be handled by a protected
catch-all route. For an authenticated visitor it SHALL render, inside the
shell with its navigation, a "Page not found" state with a "Page not found"
breadcrumb and a link back to Content, and SHALL issue no protected resource
request for the unknown path. An anonymous visitor SHALL instead be redirected
to setup while installation setup is incomplete, or to sign-in after completion,
with the unknown path as the safe return location. Malformed model
keys SHALL continue to render the client not-found state without requesting
protected model data.

#### Scenario: Signed-in user opens an unknown path
- **WHEN** an authenticated editor opens `/admin/does-not-exist`
- **THEN** the shell renders with its navigation, the breadcrumb reads "Page not found", the main content shows "Page not found" with a link to Content

#### Scenario: Anonymous visitor opens an unknown path
- **WHEN** a browser without a valid session opens `/admin/does-not-exist`
- **THEN** it is redirected to setup while incomplete, or to sign-in after completion,
  with `/does-not-exist` as the return location and sees no protected content
