## ADDED Requirements

### Requirement: The sign-in screen is a focused, accessible card
The `/login` route SHALL render a centered sign-in card, outside the
authenticated shell, with the Lace name, a "Sign in" heading, labelled email
and password fields, and a submit button. The email field SHALL receive focus
when the screen opens. The password field SHALL offer a keyboard-operable
toggle whose accessible name and pressed state describe whether the password
is visible. While a sign-in request is pending the submit button SHALL be
disabled and announce "Signing in…". A rejected sign-in SHALL show the
sanitized error inside the card as an alert, keep the entered email, and
issue no navigation. A successful sign-in SHALL continue to the safe return
location, or to `/content` when none was requested.

#### Scenario: Visitor opens sign-in
- **WHEN** an anonymous visitor opens `/login`
- **THEN** the sign-in card is shown with focus in the email field and no protected navigation

#### Scenario: Password visibility is toggled
- **WHEN** the visitor activates the password visibility toggle
- **THEN** the password is shown as text and the toggle reports itself pressed with a name that offers to hide it

#### Scenario: Sign-in is rejected
- **WHEN** the authentication boundary rejects the submitted credentials
- **THEN** the card shows the error as an alert, keeps the entered email, and the visitor stays on `/login`

#### Scenario: Sign-in succeeds with a return location
- **WHEN** a visitor redirected from `/content/posts` signs in successfully
- **THEN** the admin navigates to `/content/posts`

### Requirement: Unknown admin paths render a not-found route in the shell
Any admin path that matches no admin route SHALL be handled by a protected
catch-all route. For an authenticated visitor it SHALL render, inside the
shell with its navigation, a "Page not found" state with a "Page not found"
breadcrumb and a link back to Content, and SHALL issue no protected resource
request for the unknown path. An anonymous visitor SHALL instead be redirected
to sign-in with the unknown path as the safe return location. Malformed model
keys SHALL continue to render the client not-found state without requesting
protected model data.

#### Scenario: Signed-in user opens an unknown path
- **WHEN** an authenticated editor opens `/admin/does-not-exist`
- **THEN** the shell renders with its navigation, the breadcrumb reads "Page not found", the main content shows "Page not found" with a link to Content

#### Scenario: Anonymous visitor opens an unknown path
- **WHEN** a browser without a valid session opens `/admin/does-not-exist`
- **THEN** it is redirected to sign-in with `/does-not-exist` as the return location and sees no protected content

### Requirement: Screen states are consistent and retryable
Every admin screen SHALL present loading as a named busy status with
placeholder lines, empty results as an empty state with a title, a
description, and, where the user can act, a primary action, and failures as
an alert with a sanitized description and optional request ID. Every error
state for a failed remote read that can be repeated SHALL offer a "Try again"
action that repeats the read. The access-denied state SHALL name the missing
permission and link back to Content. Empty, not-found, and access-denied
states SHALL use a decorative icon hidden from assistive technology.

#### Scenario: A remote read fails
- **WHEN** the users, token, settings-status, collection-entry, or media-list read fails for a reason other than an expired session
- **THEN** the screen shows an alert with a Try again action, and activating it repeats that read

#### Scenario: Access is denied
- **WHEN** a viewer opens `/settings`
- **THEN** the access-denied state explains that their role lacks permission and links to Content
