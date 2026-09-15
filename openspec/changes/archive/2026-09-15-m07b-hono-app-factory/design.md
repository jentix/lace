## Context

See proposal.md for motivation. `@lacecms/server` currently exports only its
package identity. Session 7A now supplies Valibot DTO schemas, mappers,
revision parsing, and classified domain errors. The application package exposes
portable `ContentUseCases` and a `PublicContentReadPort`, but its public list
is not model-scoped and it exposes no cheap published-state version read.

Architecture sections 4.5, 6, 12, 21, and 22 require the server package to
remain runtime-neutral, use Standard Schema validation, generate OpenAPI from
the shared contracts, and keep operational/error behavior portable between Node
and Cloudflare. Session 7C owns actual Node service composition and environment
loading; Session 8 owns Better Auth.

## Goals / Non-Goals

**Goals:**

- Provide one typed, testable factory boundary whose supplied capabilities make
  its HTTP behavior independent of Node and Cloudflare adapters.
- Turn the 7A contract and existing content application behavior into the
  complete Session 7B public/admin content route surface, with correct cursors,
  ETags, errors, and operational middleware.
- Make a later authentication adapter plug into the factory without importing
  Better Auth or making anonymous admin requests look authenticated.

**Non-Goals:**

- Node process startup, SQLite/MinIO composition, environment parsing, test
  actors, proxying, or end-to-end server integration (Session 7C).
- Better Auth sessions, tokens, uploads/streaming media, content build/admin
  operations outside the content lifecycle, generated-client commits, or an
  admin UI bundle.
- A database migration or a generic infrastructure abstraction around Hono.

## Decisions

### The exported factory accepts narrow portable collaborators

`@lacecms/server` will export `createLaceApp(input)` plus input/output types.
The input groups normalized configuration, `ContentUseCases`, a
`PublicContentReadPort`, and narrow server-owned interfaces for actor
resolution, rate limiting, request-ID generation, structured logs, readiness,
environment metadata, and optional admin assets. Actor resolution accepts a
standard `Request` and returns an `Actor | null`; it is deliberately supplied,
not implemented, so Session 8 can bridge Better Auth and Session 7C can use a
test-only adapter without server code changing.

The factory will not accept a database, framework environment, or untyped
service bag. Letting routes access a repository directly would bypass portable
validation/authorization and violate the `server -> application, contracts,
auth` dependency direction. Passing a fully constructed Hono app from each
runtime was rejected because middleware and error behavior would diverge.

### Separate public reads from authenticated content commands

Admin handlers resolve the actor first and call `ContentUseCases` for list,
load, create, save, publish, and delete. Public handlers use the supplied
`PublicContentReadPort`; they resolve configured page/collection routes using
the normalized configuration and map only published values through the 7A DTO
helpers. A handler never serializes a persistence row.

To preserve collection cursor semantics, `ListPublicContentInput` gains a
required collection model key and both existing in-memory and Node adapters
filter before cursor application. To make a matching build-export ETag cheap,
`PublicContentReadPort` gains a `publishedContentVersion()` read backed by
`published_state.version`; `exportBuildContent()` is called only after a
non-match. The expanded portable reads are required by the 7B routes, not a
route-side repository shortcut.

### Contracts drive validation, rendering, and OpenAPI

Route parameters, query values, headers, request bodies, and success responses
will use the exported 7A Valibot schemas through `@hono/standard-validator`.
A small server adapter translates validator issues to the existing JSON-Pointer
validation envelope. Hono OpenAPI and Valibot JSON-Schema support will generate
`/api/v1/openapi.json` from those same route definitions rather than maintaining
a second document.

The 7A error vocabulary is extended with `NOT_FOUND`, `RATE_LIMITED`, and
`PAYLOAD_TOO_LARGE`, since an API factory otherwise cannot report all required
transport failures through the shared error envelope. Treating a missing
resource as `CONTENT_INVALID_STATE` was rejected because its `422` semantics
misrepresent a resource lookup; allowing Hono's default text errors was
rejected because it breaks the shared error contract.

### Middleware has a fixed defensive order

The factory installs request ID generation and response propagation first, then
the body-size guard, rate-limit decision, exception/error rendering, route
processing, and one completion log in a `finally` path. The log entry uses only
allowlisted metadata: request ID, method, route/template or path, status,
duration, and actor ID when resolved. JSON parsing and Standard Schema
validation run before command dispatch. The factory rejects unsafe body sizes,
does not log bodies/headers, and renders `500` with the generic shared message.

The rate limiter is supplied per request rather than tied to the SQL
`rate_limit_buckets` table, which has no adapter yet. Rate limiter keys and
retry metadata remain internal; a rejection maps only to the stable envelope.
Using Hono's default logger was rejected because it cannot guarantee the
required structured fields or secret-redaction policy.

### Health, fallback, and API namespaces are explicit

`/health/live` is a constant process-liveness response. `/health/ready` calls
the injected cheap readiness probe and reports its boolean outcome without
expensive external work. `/api/v1/openapi.json` and all content routes mount
under the API namespace. A final fallback delegates only non-`/api/` and
non-health requests to optional admin assets; unmatched API and health paths
render the shared `NOT_FOUND` envelope. This prevents a static SPA fallback
from hiding a broken endpoint or probe.

### Dependencies are introduced only in the server package

The server package adds Hono, `@hono/standard-validator`, `hono-openapi`, and
`@valibot/to-json-schema` using compatible catalog-pinned versions, alongside
the workspace `application`, `config`, `contracts`, and `domain` dependencies.
No dependency is added to `application` for HTTP or contract types. Focused
Vitest tests use the Hono Fetch interface, so no Node adapter is needed in 7B.

## Risks / Trade-offs

- [The 7A DTO schema does not yet expose a response schema for every route
  wrapper or pagination query] → Add only small composable contract primitives
  required to validate this route surface, with invalid-route tests; defer
  media/build/admin management schemas to their roadmap sessions.
- [Actor resolution is not Better Auth yet] → Require an injected resolver that
  returns `null` by default; Session 8 owns the production resolver and 7C
  confines a test resolver to tests.
- [A malformed `If-None-Match` could silently defeat cache correctness] → Parse
  it through the 7A entity-tag schema and return the stable validation envelope.
- [Portable version reads could cause an extra database query on non-matches]
  → The extra scalar read is intentional: it prevents loading an arbitrarily
  large export on matching conditional requests and retains cross-runtime
  correctness.

## Migration Plan

This adds a new internal server capability with no deployed API process. Add
the package dependencies and portable port implementations, build the factory
and focused Fetch tests, then run the workspace quality gates and strict change
validation. Session 7C will wire concrete Node dependencies. Rollback removes
the factory exports and the two additive application reads; no stored data or
HTTP-client migration is required before deployment.
