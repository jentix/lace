## Why

The shared REST DTOs from Session 7A have no HTTP execution boundary yet, so
content use cases cannot be reached through a portable API implementation.
Session 7B establishes that boundary before Session 7C supplies Node-specific
composition and integration coverage.

## What Changes

- Implement roadmap Step 7, Session 7B — Hono app factory.
- Add a runtime-neutral `@lacecms/server` factory that receives normalized
  configuration, portable content/public-read use cases, authentication,
  logging, rate limiting, health probes, admin-asset serving, and environment
  metadata through explicit interfaces.
- Add versioned public and authenticated admin content routes using the Session
  7A Valibot contracts through Standard Schema validation, explicit DTO
  mapping, sanitized errors, request IDs, structured request logging, and JSON
  body limits.
- Expose liveness/readiness endpoints and generated OpenAPI; serve the injected
  built-admin fallback only for non-API, non-health paths.
- Make the public build export conditionally cacheable using an ETag derived
  from `published_state.version`, without loading the export when the
  `If-None-Match` version already matches.

## Capabilities

### New Capabilities

- `hono-app-factory`: Runtime-neutral Hono composition, content HTTP routes,
  operational middleware, OpenAPI output, conditional build exports, and safe
  admin fallback behavior.

### Modified Capabilities

- `application-ports-and-commands`: Add a model-scoped public collection-list
  read input so its cursor remains valid for a specific collection route, and
  a lightweight published-state version read for conditional build export.
- `rest-contracts`: Add stable sanitized transport errors for missing resources,
  exhausted rate limits, and oversized request bodies.

## Impact

- Affects `packages/server`, its package dependencies and focused route tests;
  it consumes the accepted `rest-contracts`, `content-use-cases`, and
  `content-model-configuration` capabilities, and minimally extends the
  `application-ports-and-commands` public-list input/version read and
  `rest-contracts` transport errors needed for correct HTTP semantics, without
  importing a database or runtime adapter.
- Implements only Step 7B. It does not compose SQLite/Node services, load
  environment variables, implement Better Auth, stream media objects, add
  operational admin/media/build/user routes, or enable a production server;
  those remain Session 7C and later units.
- Aligns with architecture sections 4.5, 6, 12, 21, and 22, including the
  dependency direction `server -> application, contracts, auth` and the
  versioned `/api/v1` transport boundary.
