# hono-app-factory Specification

## Purpose

Defines the portable HTTP content boundary that gives Node and Cloudflare the
same validated API, operational behavior, and safe static-admin fallback.

## Requirements

### Requirement: Runtime-neutral API composition
The system SHALL construct the versioned HTTP application from normalized
configuration, portable content and public-read capabilities, actor resolution,
rate limiting, structured logging, health checks, environment metadata, and an
optional admin-asset responder supplied by the runtime composition root. The
HTTP package SHALL not require database, object-storage, Node, or Cloudflare
types. The application SHALL expose generated OpenAPI at
`/api/v1/openapi.json`, with the versioned content routes and their shared
request, response, and error representations.

#### Scenario: Equivalent runtimes compose one API surface
- **WHEN** Node and Cloudflare composition roots provide equivalent portable
  capabilities and environment metadata
- **THEN** each application exposes the same versioned routes and contract
  representations without the HTTP package importing either runtime adapter

#### Scenario: Documentation is requested
- **WHEN** a client requests `/api/v1/openapi.json`
- **THEN** it receives generated OpenAPI describing the versioned content
  routes from the shared transport contracts

### Requirement: Operational request boundary is safe and observable
The system SHALL assign every request a request identifier, include it in the
response, and emit one structured completion record containing the request
identifier, route, status, duration, and authenticated actor identifier when
available. It SHALL apply configured request-rate limits and JSON/body-size
limits before protected or mutation work runs. It SHALL return the shared
sanitized error envelope for contract validation, authorization, known
application failures, malformed bodies, body-limit failures, and unexpected
exceptions; no response or log record SHALL disclose stack traces, SQL text,
credentials, or raw request bodies.

#### Scenario: A malformed oversized mutation arrives
- **WHEN** a request exceeds the configured body limit or cannot be decoded as
  JSON for a content mutation
- **THEN** it is rejected before a mutation capability runs with a sanitized
  stable error envelope and is recorded with its request identifier

#### Scenario: A request fails unexpectedly
- **WHEN** an unclassified exception escapes route processing
- **THEN** the client receives only the stable internal-error envelope while
  the completion record contains the request identifier and no secret or raw
  exception content

### Requirement: Liveness and readiness stay separate from content routes
The system SHALL expose unauthenticated `GET /health/live` and
`GET /health/ready` endpoints. Liveness SHALL confirm that the HTTP process can
serve requests without checking dependencies. Readiness SHALL use the supplied
cheap readiness capability to report unavailable configuration or required
dependencies without performing an expensive external operation. Health
endpoints SHALL not be handled by the admin fallback or versioned API router.

#### Scenario: A dependency is unavailable
- **WHEN** the readiness capability reports configuration or database
  unavailability
- **THEN** `GET /health/ready` reports failure while `GET /health/live`
  continues to report that the HTTP process is alive

### Requirement: Public and admin content routes honor shared contracts
The system SHALL provide the `/api/v1` public content endpoints for configured
pages, configured collection lists and items, lookup by public path, and build
export, plus the authenticated admin endpoints for content-model metadata,
model entry listing and creation, entry loading, complete-draft save,
publication, and deletion. Requests and responses SHALL validate against the
shared REST contracts before dispatch and serialization. Admin routes SHALL
resolve an actor before application work and preserve the shared authorization,
revision-precondition, and idempotency behavior. Public routes SHALL return
only immutable published content and SHALL not require an admin actor.

#### Scenario: An editor saves a complete draft through HTTP
- **WHEN** an authenticated editor sends a valid complete-draft request with a
  valid revision precondition to an entry they may write
- **THEN** the application receives the normalized actor and complete draft,
  and the response contains the updated entry DTO rather than persistence data

#### Scenario: An unauthenticated caller requests an admin entry
- **WHEN** a caller has no resolved actor and requests an admin content route
- **THEN** the request returns the shared authorization error before a content
  read or mutation capability runs

#### Scenario: A public collection page is requested
- **WHEN** a caller requests a configured collection with a valid opaque cursor
- **THEN** the response contains only that collection's published entries and
  a continuation cursor that can be supplied to the same collection route

### Requirement: Build export supports version-derived conditional reads
The system SHALL derive the build-export ETag from the current published-state
version. On a matching `If-None-Match` value, it SHALL return `304 Not
Modified` with the ETag and SHALL not load the complete export. On a missing or
non-matching value, it SHALL return the validated build-export representation
and its version-derived ETag. A malformed conditional tag SHALL be rejected as
a shared validation error.

#### Scenario: A build consumer already has the current export
- **WHEN** `If-None-Match` encodes the current published-state version
- **THEN** the build-export endpoint returns `304` without loading the full
  export payload

#### Scenario: Publication has advanced the version
- **WHEN** `If-None-Match` encodes an older valid version
- **THEN** the endpoint loads and returns the current export with the new ETag

### Requirement: Admin assets cannot mask API or health failures
The system SHALL delegate a non-API, non-health request to the supplied
built-admin responder when one is configured. It SHALL never delegate paths
under `/api/` or either health endpoint to that responder; unmatched paths in
those namespaces SHALL retain their API or health failure response.

#### Scenario: A browser loads an admin client-side route
- **WHEN** the built-admin responder is configured and the browser requests a
  non-API, non-health client-side route
- **THEN** the application delegates the request to that responder

#### Scenario: An unknown API path is requested
- **WHEN** a request under `/api/` does not match a versioned endpoint
- **THEN** it receives an API failure response and never receives the admin
  application fallback

### Requirement: Authentication routes and protected routes have separate boundaries
The system SHALL dispatch `/api/auth/*` to the configured authentication
provider before catch-all API and admin-asset fallback routes. It SHALL resolve
an actor only for protected routes and SHALL leave health endpoints and
documented public content routes unauthenticated. Route handlers SHALL pass
the resolved actor to application use cases, which retain responsibility for
permission checks; handlers SHALL NOT compare role strings.

#### Scenario: Authentication route is not masked
- **WHEN** a request targets a known authentication-provider route below
  `/api/auth/`
- **THEN** the provider handles it rather than an API catch-all or admin asset
  responder

#### Scenario: Public route remains anonymous
- **WHEN** an unauthenticated caller requests a documented public content or
  health route
- **THEN** it receives that route's normal response without an actor-resolution
  attempt

#### Scenario: Protected route delegates authorization
- **WHEN** a validated editor requests an admin mutation that requires a
  permission the editor lacks
- **THEN** the route passes the actor to the application boundary and returns
  its shared authorization failure without comparing the role in the handler
