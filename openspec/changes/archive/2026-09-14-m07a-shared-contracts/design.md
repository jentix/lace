## Context

See proposal.md for motivation. `@lacecms/contracts` currently exports only
its package identity, while `@lacecms/application` exposes portable content
commands and values. Architecture sections 6 and 12 require transport DTOs to
remain a dependency leaf with respect to the application layer, while later
Step 7 sessions will consume the contracts from Hono routes and the Node
composition root.

## Goals / Non-Goals

**Goals:**

- Make one public, runtime-validated contract vocabulary for all Step 7 content
  endpoints before a web framework is introduced.
- Keep conversion between portable application values and JSON DTOs explicit and
  deterministic.
- Centralize error mapping and precondition/header parsing so Hono handlers do
  not invent incompatible behavior.

**Non-Goals:**

- Adding HTTP routes, Hono, authentication middleware, OpenAPI serving, storage
  streaming, application use-case dependencies, or Node runtime wiring.
- Finalizing media upload or admin/user/token endpoint payloads that belong to
  subsequent roadmap sessions.

## Decisions

### Contract package owns runtime schemas and DTO mapping

`packages/contracts` will add Valibot schemas, inferred transport types, and
explicit mapper helpers for application/domain content values. It can depend on
portable `domain` and `content` public entries, as permitted by architecture
section 6, but `application` will not import contracts.

Keeping schemas inside route files was rejected because clients, generated
OpenAPI, and both runtime adapters would duplicate observable behavior. Making
database schemas the DTO source was rejected because it would leak persistence
shape and violate the architecture's explicit contract rule.

### Wire format is intentionally JSON-first

The schemas use plain JSON DTOs: identifiers and opaque cursors are strings,
snapshot fields and block data are JSON values, and timestamps are canonical
ISO-8601 UTC strings. Mapper helpers convert portable Unix-millisecond values
at the boundary. This preserves cross-runtime portability and keeps SDK and
admin consumers free of implementation types.

### Header affordances normalize to one revision input

Generated clients emit `expectedRevision` in JSON bodies. A small helper parses
an optional `If-Match` revision and combines it with the body value: either
source is accepted, but both must agree. This retains conventional HTTP support
without creating two application commands or permitting accidental stale writes.

### Deletion carries its guard through the atomic persistence boundary

The approved scope expansion adds the caller's expected draft revision to the
portable delete use-case and command inputs. The use case derives the current
published-snapshot identity after authorization and passes it as an internal
freshness guard. The in-memory double and Node repository then require both the
draft revision and publication identity to match inside their deletion mutation.
This additionally prevents a concurrent publication from turning an editor's
previously authorized draft deletion into removal of newly published content.

Only the client-visible revision crosses HTTP. The publication identity is an
application-to-persistence guard, not a REST DTO. A route-only preflight check
was rejected because it leaves a race between validation and deletion; changing
publication to increment draft revision was rejected because it would alter the
established draft/public snapshot model.

### Errors are classified before rendering

One classifier turns known domain/application errors and validation failures
into a status, stable code, safe message, and JSON-Pointer issue details.
Unknown errors are represented only by a generic internal-error contract in
this package; the later server layer decides logging and response rendering.
This avoids exposing internal exception text while ensuring every known
application error has one reproducible status/code mapping.

## Risks / Trade-offs

- [Later API routes need DTO shapes not yet represented by application reads]
  → Keep schemas composable and add only public mappings for values already
  available through the portable contracts.
- [UTC canonicalization can reject otherwise valid offset timestamps] → Require
  canonical UTC on the wire to meet the architecture invariant and avoid
  response-format drift.
- [Weakly specified HTTP entity tags could fragment clients] → Restrict the
  shared format to a quoted, version-derived entity tag and test acceptance and
  rejection boundaries.
- [A concurrent publication could bypass a draft-only deletion authorization]
  → Guard deletion against both the current draft revision and publication
  identity in the same persistence mutation.

## Migration Plan

This is a new package capability with no deployed REST clients. Add schemas and
tests, run the workspace quality gates and strict OpenSpec validation, then make
later 7B routes consume the shared exports. A rollback removes the new package
exports; no stored data or network endpoint migration is involved.
