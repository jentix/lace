## Why

Sessions 4A and 4B define portable content rules, command ports, and an
in-memory reference adapter, but callers still have no application service that
authorizes, validates, and orchestrates those capabilities. Session 4C completes
the executable in-memory content vertical slice before persistent adapters are
introduced in Step 5.

## What Changes

- Add transport-neutral content use cases for entry creation, listing, loading,
  full-draft save, publication, and deletion against the focused application
  ports.
- Validate complete drafts against the normalized model and block registry before
  an atomic save, including field/block semantics, media references, ordering,
  and shared byte/count limits; rerun strict publish validation before publish.
- Require content permissions at the use-case boundary; require publish
  permission for deletion when an entry has public output.
- Publish through the guarded command port with a generated snapshot ID and
  current time, retain publication success when downstream build triggering is
  unavailable, and reuse a prior result for an idempotency-key retry.
- Add focused application tests for authorization, singleton and revision races,
  publication route conflicts, idempotency, and draft/public snapshot isolation.

Scope is roadmap Step 4, Session 4C. This change does not add database adapters,
HTTP DTOs/routes, auth-session integration, media upload/deletion workflows,
outbox dispatch, or build-status persistence.

## Capabilities

### New Capabilities

- `content-use-cases`: Portable authorization, validation, lifecycle, and
  idempotency behavior for content-entry application services.

### Modified Capabilities

- `application-ports-and-commands`: Extend the guarded publication contract so
  a persistence adapter can atomically recognize and reuse a publication
  idempotency key.

## Impact

- Implements roadmap Step 4, Session 4C and the executable behavior anticipated
  by the Step 5 SQLite/D1 persistence work.
- Follows architecture sections 4.3–4.5, 4.7, 6, 9.2–9.8, 10, and 15: code-first
  models, draft/published separation, portable capabilities, immutable public
  snapshots, package direction, and explicit build-trigger boundaries.
- Builds on accepted `application-ports-and-commands`, `content-domain-rules`,
  `content-model-configuration`, `content-validation`, and `block-registry`
  specifications without changing their accepted requirements.
- Affects `@lacecms/application` and its tests, with `@lacecms/test-utils`
  extended only where the use-case contract requires an in-memory collaboration
  seam; no transport, database, Node, or Cloudflare dependency is introduced.
