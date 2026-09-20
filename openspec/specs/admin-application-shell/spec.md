# admin-application-shell Specification

## Purpose

Defines the browser-admin foundation so authenticated Lace users can navigate
an accessible, responsive shell without exposing protected content or controls
before their session and role have been resolved.

## Requirements

### Requirement: The admin application provides a coherent accessible UI system
The admin application SHALL provide Lace-owned Button, Input, Select, Dialog,
Toast, Table, Badge, Skeleton, EmptyState, and ErrorState controls, styled from
shared color, typography, spacing, radius, focus, and motion tokens. Interactive
controls SHALL have an accessible name, visible keyboard focus indication, and
contrast suitable for their state. The application SHALL honour reduced-motion
preferences and remain usable at narrow viewport widths without requiring a
horizontal page scroll.

#### Scenario: A keyboard user operates an owned control
- **WHEN** a keyboard-only user reaches an enabled owned control
- **THEN** the control exposes its accessible name, receives a visible focus
  indication, and can be operated without a pointing device

#### Scenario: Motion reduction is requested
- **WHEN** the browser reports a reduced-motion preference
- **THEN** the application suppresses non-essential transitions and animation

#### Scenario: The shell is viewed on a narrow screen
- **WHEN** an authenticated user opens the admin shell at a narrow viewport
- **THEN** navigation and route content remain reachable without horizontal
  page scrolling

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
The admin shell SHALL present shared content, media, and build navigation to
authenticated Lace roles and SHALL present Users and Settings navigation only
to an `admin` session. A non-admin who opens `/users` or `/settings` directly
SHALL receive an access-denied route state without the route's protected
content or controls. Hiding navigation SHALL be treated only as a user
interface affordance and SHALL not change the API's authorization authority.

#### Scenario: An editor views the shell
- **WHEN** a session with the `editor` role opens the content landing route
- **THEN** it receives the shared shell navigation and no Users or Settings
  navigation affordance

#### Scenario: A viewer opens an administrator route directly
- **WHEN** a session with the `viewer` role opens `/users`
- **THEN** it receives an access-denied state and no user-management controls

#### Scenario: An administrator opens an administrator route
- **WHEN** a session with the `admin` role opens `/settings`
- **THEN** it receives the settings-route foundation within the shared shell
