# admin-remote-state-and-lists Specification

## Purpose

Defines how the Lace browser admin consumes authenticated remote state so users
can establish a session, navigate configured models, and manage collection
entries with clear recovery behavior.

## Requirements

### Requirement: The admin client validates credentialed API exchanges
The admin application SHALL send same-origin credentials for its authentication
and `/api/v1/admin/*` requests, validate successful API payloads against the
shared contracts, and map unsuccessful responses to one consistent user-facing
error representation. For API failures, the technical error details SHALL
include the response request ID when the API supplies one; it SHALL not expose
credentials, stack traces, or unvalidated response bodies.

#### Scenario: A validated list response is received
- **WHEN** the authenticated admin application receives a successful content
  model or entry-list response
- **THEN** it uses the shared runtime contract before presenting the response
  data

#### Scenario: An API error has a request ID
- **WHEN** an admin API request fails and its response supplies a request ID
- **THEN** the visible error state provides that ID in technical details without
  exposing credential or server-internal data

### Requirement: Authentication state recovers safely
The admin application SHALL provide accessible email/password sign-in and
sign-out actions. It SHALL preserve only a safe same-origin return location
after sign-in. When a protected remote request establishes that the browser
session is missing or expired, the application SHALL clear stale authenticated
state and redirect to login without rendering protected content or actions.

#### Scenario: A user signs in from a protected return location
- **WHEN** an unauthenticated user signs in successfully after opening a safe
  protected admin location
- **THEN** the application refreshes session state and redirects to that
  location

#### Scenario: A session expires during a protected request
- **WHEN** a protected admin request indicates that its browser session is no
  longer valid
- **THEN** the application clears authenticated remote state and redirects to
  login without retaining protected content or controls

### Requirement: Model navigation and collection lists reflect configured remote state
The authenticated content landing route SHALL load configured content models.
For every page model it SHALL provide a link to that model's singleton editor
route. For every collection model it SHALL provide a link to a model route that
loads its entries through the API's opaque cursor pagination and presents an
accessible next-page action when another cursor exists. Collection entry lists
SHALL provide distinct loading, empty, error, and populated states.

#### Scenario: Configured page and collection models are loaded
- **WHEN** an authenticated user opens the content landing route
- **THEN** each page model links directly to its singleton editor route and each
  collection model links to its entry-list route

#### Scenario: A collection has another page of entries
- **WHEN** a collection entry-list response includes a next cursor
- **THEN** the user can request the next page without decoding or modifying the
  cursor

#### Scenario: A collection contains no entries
- **WHEN** a collection entry-list response contains no items
- **THEN** the model route presents an explicit empty state rather than an empty
  table or a loading indicator

### Requirement: Collection-entry mutations expose permission-aware affordances
The admin application SHALL expose collection-entry creation and deletion only
where the resolved role permits the action, while treating that visibility as a
convenience rather than authorization. It SHALL submit create and delete
requests through the authenticated API and, after a successful mutation,
refresh the affected model and entry-list state. The deletion action SHALL be
reachable by keyboard and require explicit user confirmation.

#### Scenario: A viewer opens a collection list
- **WHEN** a `viewer` opens a collection model route
- **THEN** it can inspect the entry list but is not offered create or delete
  controls

#### Scenario: An editor creates an entry
- **WHEN** an `editor` completes the create-entry action for a collection
- **THEN** the application creates the entry through the API and refreshes the
  collection list before presenting the result

#### Scenario: A permitted user deletes an entry
- **WHEN** a permitted user confirms deletion of a collection entry
- **THEN** the application sends the delete request and refreshes affected
  collection state only after the API confirms success
