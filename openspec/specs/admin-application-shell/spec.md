# admin-application-shell Specification

## Purpose

Defines the browser-admin foundation so authenticated Lace users can navigate
an accessible, responsive shell without exposing protected content or controls
before their session and role have been resolved.

## Requirements

### Requirement: The admin application provides a coherent accessible UI system
The admin application SHALL provide Lace-owned Button, Input, Textarea, Select,
Dialog, Sheet, DropdownMenu, Popover, Tooltip, Toaster, Table, Tabs, Badge,
Skeleton, Calendar, ScrollArea, EmptyState, and ErrorState controls, styled
only through the `admin-design-system` color, typography, spacing, radius,
shadow, focus, and motion tokens using utility classes rather than hand-written
component CSS. Interactive controls SHALL have an accessible name, visible
keyboard focus indication, and contrast suitable for their state. The
application SHALL honour reduced-motion preferences and remain usable at narrow
viewport widths without requiring a horizontal page scroll.

#### Scenario: A keyboard user operates an owned control
- **WHEN** a keyboard-only user reaches an enabled owned control
- **THEN** the control exposes its accessible name, receives a visible focus
  indication drawn from the focus token, and can be operated without a pointing
  device

#### Scenario: Motion reduction is requested
- **WHEN** the browser reports a reduced-motion preference
- **THEN** the application suppresses non-essential transitions and animation

#### Scenario: The shell is viewed on a narrow screen
- **WHEN** an authenticated user opens the admin shell at a narrow viewport
- **THEN** navigation and route content remain reachable without horizontal
  page scrolling

#### Scenario: Owned controls are restyled through tokens
- **WHEN** a theme token value changes
- **THEN** every owned control using that token reflects the new value without
  a component source change

#### Scenario: A notification is raised
- **WHEN** admin code raises a notification through the Toaster
- **THEN** the notification is rendered in a polite live region and offers a
  dismiss control with an accessible name

### Requirement: Typed client routes cover the Session 11A admin surface
The admin application SHALL provide typed client routes for `/login`,
`/content`, `/content/:modelKey`, `/content/:modelKey/:entryId`, `/media`,
`/builds`, `/users`, and `/settings`. Refreshing one of these client routes
through the configured API/admin composition SHALL render the corresponding
admin client route rather than an API or health fallback response. The content
landing, and content-model routes SHALL present their Session 11B remote-state
behavior; resource screens outside Session 11B may retain their foundation
placeholders.

#### Scenario: A model-entry route is refreshed
- **WHEN** a browser refreshes `/content/posts/entry-123` through the admin
  deployment
- **THEN** the admin application renders the entry-route foundation and does
  not treat the path as an unknown API resource

#### Scenario: An invalid model key is presented
- **WHEN** a browser opens a content-model route whose parameter does not match
  the route's model-key grammar
- **THEN** the application renders its client not-found state without issuing a
  request for protected model data

### Requirement: Session guards prevent protected-content flashes
Before rendering a protected route or protected navigation affordance, the
admin application SHALL resolve the current same-origin browser session. While
that resolution is pending, it SHALL render only a neutral loading state. When
there is no valid session, it SHALL redirect to `/login` while retaining a safe
post-login return location; it SHALL not briefly render protected route content
or actions. An authenticated visitor to `/login` SHALL be redirected to the
safe content landing route.

#### Scenario: An anonymous visitor opens a protected entry URL
- **WHEN** a browser without a valid session opens `/content/posts/entry-123`
- **THEN** it sees no entry content or protected controls and is redirected to
  the login route with a safe return location

#### Scenario: A session is still being checked
- **WHEN** a browser opens a protected route and session resolution has not
  completed
- **THEN** it sees a neutral loading state and no protected route content or
  navigation affordance

### Requirement: Role-gated shell navigation is enforced at the route boundary
The admin shell SHALL group its navigation into Pages, Collections, Library,
and Admin. Pages and Collections SHALL list the configured page and collection
models from the authenticated content-model response. Library SHALL present
Media and Builds navigation to every authenticated Lace role. Admin SHALL
present Users and Settings navigation only to an `admin` session, and the Admin
group SHALL be omitted entirely for other roles. A non-admin who opens `/users`
or `/settings` directly SHALL receive an access-denied route state without the
route's protected content or controls. Hiding navigation SHALL be treated only
as a user interface affordance and SHALL not change the API's authorization
authority.

#### Scenario: An editor views the shell
- **WHEN** a session with the `editor` role opens the content landing route
- **THEN** it receives the Pages, Collections, and Library navigation groups
  and no Admin group, Users, or Settings navigation affordance

#### Scenario: A viewer opens an administrator route directly
- **WHEN** a session with the `viewer` role opens `/users`
- **THEN** it receives an access-denied state and no user-management controls

#### Scenario: An administrator opens an administrator route
- **WHEN** a session with the `admin` role opens `/settings`
- **THEN** it receives the settings-route foundation within the shared shell
  and the Admin navigation group with Users and Settings

### Requirement: Admin entry redirects to the content home
The admin application SHALL redirect the `/admin/` entry path to `/admin/content` and apply the usual session guard before showing protected content.

#### Scenario: Anonymous visitor opens admin entry
- **WHEN** an unauthenticated visitor opens `/admin/`
- **THEN** the visitor reaches sign-in with a safe return location and sees no protected content

#### Scenario: Authenticated visitor opens admin entry
- **WHEN** an authenticated visitor opens `/admin/`
- **THEN** the visitor reaches the content landing screen

### Requirement: Admin shell exposes logout
The authenticated shell SHALL expose a user menu that shows the signed-in
user's display name and role and offers a keyboard-operable log out action.
The display name SHALL come from the same-origin session response (the user's
name, otherwise their email); when neither is available the menu SHALL show a
neutral label and SHALL never show the user's internal identifier. Successful
logout SHALL invalidate the browser session and clear protected cached state;
a failed logout SHALL show an error and leave the user signed in.

#### Scenario: Administrator logs out
- **WHEN** an administrator opens the user menu, activates log out, and the
  auth endpoint confirms success
- **THEN** the shell clears protected state and navigates to sign-in

#### Scenario: The user menu identifies the signed-in user
- **WHEN** a session whose response names the user "Ada Editor" with the
  `editor` role opens any protected route
- **THEN** the user menu shows "Ada Editor" and "Editor" and does not show the
  user's internal identifier

#### Scenario: The session response carries no name
- **WHEN** the session response has neither a name nor an email
- **THEN** the user menu shows a neutral signed-in label instead of an
  identifier

#### Scenario: Logout fails
- **WHEN** the auth endpoint rejects the logout request
- **THEN** the shell shows the error and keeps the protected route rendered

### Requirement: Shell navigation reflects configured content
Each page model in the Pages group SHALL link directly to its singleton entry
editor when the singleton exists, and SHALL otherwise link to the content
overview where synchronization guidance is shown. Each collection model in the
Collections group SHALL link to its entry list and SHALL show the collection's
total entry count once it is known. Navigation items SHALL use the model's
label, falling back to its key, SHALL carry an icon that is hidden from
assistive technology, and SHALL mark the item matching the current location as
the current page. A failed count or singleton lookup SHALL not hide the
navigation item or block the route content. Creating, deleting, saving, or
publishing an entry SHALL refresh the affected counts and page links.

#### Scenario: A collection count is shown
- **WHEN** the entry-list totals for the `posts` collection report 12 entries
- **THEN** the Posts navigation item links to `/content/posts` and shows 12,
  and its accessible name states the entry count

#### Scenario: A page opens its singleton editor
- **WHEN** the `home` page model has a synchronized singleton entry
- **THEN** its Pages navigation item links to that entry's editor route

#### Scenario: The current location is marked
- **WHEN** a user is on `/content/posts/entry-1`
- **THEN** the Posts navigation item is marked as the current location

#### Scenario: A count request fails
- **WHEN** the entry-list request for a collection fails
- **THEN** its navigation item remains available without a count and the route
  content still renders

#### Scenario: A created entry updates the count
- **WHEN** an editor creates an entry in `posts`
- **THEN** the Posts navigation count is refreshed from the API

### Requirement: The shell header shows breadcrumbs without internal identifiers
The route header SHALL present breadcrumb navigation that locates the current
screen: the content overview, a model by its label, and an entry by its title,
or the resource screen name for Media, Builds, Users, and Settings. Every
breadcrumb except the last SHALL be a link, and the last SHALL be marked as the
current page. A model breadcrumb SHALL use the model's label, falling back to
its configured key. While an entry title is loading or unavailable the
breadcrumb SHALL use a neutral word. Breadcrumbs SHALL never show an entry ID
or a user ID.

#### Scenario: A collection entry is open
- **WHEN** a user opens an entry titled "First post" in the `posts` collection
  labelled "Posts"
- **THEN** the header breadcrumbs read Content, Posts, First post, with Content
  and Posts as links and First post as the current page

#### Scenario: A page singleton is open
- **WHEN** a user opens the singleton editor of the `home` page
- **THEN** the breadcrumbs read Content and the page label, without the entry
  ID

#### Scenario: An entry title is still loading
- **WHEN** the entry has not loaded yet
- **THEN** the last breadcrumb shows a neutral "Entry" label, not the entry ID

### Requirement: Narrow screens open navigation in a focus-safe sheet
Below the medium breakpoint the shell SHALL hide the persistent sidebar and
provide an "Open navigation" header control that opens the same navigation in
a modal sheet from the leading edge. The sheet SHALL trap focus while open,
close on Escape, on its close control, or when a navigation item is activated,
and SHALL return focus to the opening control when it closes. The shell SHALL
provide a skip link to the main content as the first focusable element, and
the keyboard order SHALL follow skip link, navigation, header, then route
content.

#### Scenario: A narrow-screen user opens and dismisses navigation
- **WHEN** a keyboard user at a narrow viewport activates "Open navigation" and
  then presses Escape
- **THEN** the navigation sheet opens with focus inside it and, on close, focus
  returns to "Open navigation"

#### Scenario: A narrow-screen user navigates from the sheet
- **WHEN** a user activates the Media item in the open sheet
- **THEN** the sheet closes and the Media route renders

#### Scenario: A keyboard user skips navigation
- **WHEN** a keyboard user presses Tab once on a protected route and activates
  the skip link
- **THEN** focus moves to the main route content
