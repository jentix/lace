## Context

See proposal.md for motivation. `@lacecms/domain` already owns immutable entry
transitions, permissions, routes, and stable errors. `@lacecms/application`
currently exposes focused read/command ports, while `@lacecms/test-utils`
provides an invariant-enforcing in-memory content store. The content and config
packages provide normalized models, executable block definitions, and
mode-specific aggregate validators. No HTTP, database, or runtime adapter is in
scope.

## Goals / Non-Goals

**Goals:**

- Add one portable application façade that takes actor-scoped content commands
  and delegates mutations only to the existing specialized atomic ports.
- Resolve runtime model/registry context once per command and normalize complete
  aggregates before persistence.
- Make publish idempotency durable at the guarded publication boundary, so a
  later SQLite or D1 implementation can prevent concurrent duplicate
  publications.
- Keep a successful publication observable even when the separate site-build
  trigger cannot accept a request.

**Non-Goals:**

- Adding REST request/response types, an authentication adapter, database
  schema/migrations, media object operations, an outbox, retry scheduling, or
  persisted build status.
- Supporting partial field/block patching, revision history, unpublish,
  scheduled publication, cross-entry bulk operations, or generic transactions.

## Decisions

### Compose a single injected content-use-case service

`@lacecms/application` will expose a service constructed from a normalized
runtime configuration, content query/command ports, media reads, clock, ID
generator, and optional site-build trigger. Its public inputs use only portable
domain/configuration values and explicit actors. Model lookup and all permission
checks happen in the service before a mutation port call; query methods receive
the actor and enforce `content:read` before delegating. This preserves the
package boundary and gives later Hono handlers a uniform orchestration entry
point.

Alternative considered: expose independent functions that accept a broad bag of
dependencies per request. Rejected because it would make permission and model
resolution inconsistent across operations and awkward to compose in either
runtime.

### Validate full aggregates and media references before command calls

Create and save build a complete candidate draft then use the content aggregate
validator in draft mode; publish loads the persisted draft and repeats it in
publish mode. The service additionally walks model-field and resolved
block-definition descriptors to collect present media identifiers, reads their
metadata through `MediaReadPort`, and rejects missing or non-active items. The
domain ordered-position assertion is applied to the normalized blocks because
the content aggregate validator establishes semantic block validity but does not
own sparse-position persistence rules. No write port is called when any step
fails.

Alternative considered: validate only in database adapters. Rejected because
Node and Cloudflare would then diverge and the in-memory vertical slice would
not enforce the accepted aggregate contract.

### Keep publication idempotency inside the specialized atomic command

The guarded publication input will gain an optional non-empty idempotency value
containing the actor scope, client key, and a canonical fingerprint of the
publication request. The command result will distinguish a fresh publication
from an identical replay. The in-memory store records that value only after a
successful guarded publication and rejects a reused key whose fingerprint does
not match. Application code triggers a build only for a fresh result. Step 5
will persist the same record atomically with publication rather than treating a
best-effort cache as correctness state.

Alternative considered: use the derived cache port to deduplicate requests.
Rejected because cache eviction is explicitly non-authoritative and cannot make
concurrent publication retries safe. A process-local map is rejected for the
same cross-runtime and restart reasons.

### Return build dispatch as an independent, best-effort outcome

After a fresh guarded publication commits, the service exports the new public
version and invokes the site-build trigger. The returned use-case value includes
the committed publication plus a separate accepted, rejected, unavailable, or
replay-not-dispatched build outcome. Trigger errors are converted to an
unavailable outcome; they never roll back or cause a second content mutation.
Replayed publications return the existing publication and do not invoke the
trigger again. Persisted build-event state and recovery are deliberately left to
Step 13's outbox design.

Alternative considered: trigger the build before publication. Rejected because
a build could expose stale or uncommitted public data and trigger failure would
incorrectly block a valid publication.

### Preserve in-memory fake parity through contract tests

The content-store fake will be extended only for the new publication idempotency
command semantics. Application tests will compose it with deterministic clock,
IDs, media data, and site-build trigger fakes to assert behavior through the
same service API that later adapters will use. The existing fake remains the
reference for atomic conflicts, detached values, and public-version behavior.

Alternative considered: mock every command port in service tests. Rejected
because it would miss the concurrency and immutable-publication interactions
required by the roadmap acceptance slice.

## Risks / Trade-offs

- [Media-reference traversal can miss a future descriptor shape] → Traverse the
  existing discriminated descriptors exhaustively and make a new field kind a
  compile-time change; add direct media-reference tests.
- [Fingerprint composition could differ between adapters] → Calculate it from
  canonical portable JSON in application code and pass the opaque value to the
  command rather than asking adapters to serialize request objects.
- [Build trigger failure is not retried in this session] → Return an explicit
  independent failure outcome; Step 13 adds durable outbox delivery and retries.
- [The in-memory idempotency map is not durable] → Treat it as a contract fake;
  Step 5 must implement equivalent atomic persistence before it is a production
  adapter.

## Migration Plan

No public API or persistent adapter exists. Add portable exports and focused
tests, extend the in-memory fake's command contract, and validate package edges.
The change can be reverted by removing the service and idempotency additions;
once Step 5 persists the contract, any migration will be introduced there.
