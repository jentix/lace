## Why

The content lifecycle is portable through the application layer, but it has no
versioned HTTP representation yet. Session 7A establishes one shared,
runtime-validated transport contract before the Hono routes and Node composition
introduced by later Step 7 sessions.

## What Changes

- Implement roadmap Step 7, Session 7A — Shared contracts.
- Add `@lacecms/contracts` Valibot schemas and DTO mappings for the content
  vertical slice: content models, admin entry reads and mutations, public reads,
  build export, media metadata, build state, pagination, and the shared error
  envelope.
- Define stable domain/application-error status and code mappings, validation
  issue paths, ISO-8601 UTC JSON timestamps, opaque cursor values, ETags,
  idempotency keys, and equivalent revision preconditions.
- Extend guarded deletion through the application command, in-memory double,
  and Node SQLite adapter so the contract's delete precondition is applied
  atomically rather than being a route-only assertion.
- Add contract schema round-trip and invalid-payload tests.

## Capabilities

### New Capabilities

- `rest-contracts`: Versioned, runtime-validated shared REST DTOs and transport
  conventions for the content API.

### Modified Capabilities

- None.

## Impact

- Affects `packages/contracts`, `packages/application`,
  `packages/platform-node`, `packages/test-utils`, and their focused tests.
- Establishes the public contract consumed by the Step 7B Hono app factory and
  Step 7C Node composition; it does not add routes, runtime wiring,
  authentication, media-object streaming, Hono routing, OpenAPI serving, or
  Node runtime composition.
- Aligns with architecture sections 6 and 12, the Step 7 roadmap boundary, and
  the accepted `application-ports-and-commands` and `content-use-cases`
  specifications without making REST DTOs application dependencies.
- The user-approved expansion combines this otherwise earlier
  application/repository correction with 7A because a delete precondition cannot
  be independently verified at the REST contract boundary: it must be an atomic
  portable command before later Hono routes can expose it safely.
