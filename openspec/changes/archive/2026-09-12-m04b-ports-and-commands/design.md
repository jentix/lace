## Context

See proposal.md for motivation. `@lacecms/domain` now provides immutable
aggregates and pure lifecycle/routing rules, while `@lacecms/application` and
`@lacecms/test-utils` remain scaffolds. Architecture sections 4.5, 6, 9.2–9.8,
10, 14, and 15 require portable, specialized capabilities rather than a broad
transaction abstraction. The accepted configuration and content specs already
define the normalized model, field, and block inputs that future use cases will
validate.

## Goals / Non-Goals

**Goals:**

- Add a single portable application API for content reads, specialized atomic
  mutations, model synchronization, public/build projections, and infrastructure
  capabilities.
- Make the in-memory doubles faithful enough to test the Session 4C vertical
  slice, including conflict and immutability cases that SQL/D1 adapters must
  later reproduce.
- Preserve package direction: application imports domain/content/configuration
  contracts only; test-utils imports application/domain/configuration/content;
  neither imports REST, database, framework, Node, or Cloudflare code.

**Non-Goals:**

- Implementing HTTP mapping, authorization orchestration, content validation
  use cases, database schema or queries, vendor-specific storage/cache clients,
  a background worker, or a generic unit-of-work API.
- Making in-memory state a production adapter or adding revision history,
  unpublish, scheduled publication, or cache-dependent correctness.

## Decisions

### Divide state access into query and specialized command ports

`@lacecms/application` will define readonly input/output values and separate
interfaces for model synchronization, entry reads, entry mutations, public
reads/build export, and dispatcher persistence. Each mutation carries only the
preconditions that its atomic implementation needs: e.g. create observes the
model's singleton state, draft replacement uses an expected revision, and
publication combines revision guarding, route ownership, the published snapshot
replacement, and build-state creation. This lets a Node adapter use a SQLite
transaction and a D1 adapter use guarded batches without exposing an arbitrary
callback whose guarantees D1 cannot share.

Alternative considered: one repository with generic CRUD and a
`withTransaction` callback. Rejected because it allows callers to compose
non-portable read/modify/write sequences and hides the D1 constraint described
in architecture section 10.

### Keep command values transport- and row-independent

Commands accept branded domain IDs, actors, complete drafts, normalized model
data, opaque cursors, and application-owned result/status unions. Mappers in
later database and REST layers own their row/DTO transformations. Result values
are immutable detached data, so fakes and later adapters can have identical
caller-visible semantics.

Alternative considered: reuse Valibot DTOs or Drizzle rows at the port
boundary. Rejected because it reverses the dependency direction and would make
application tests depend on a runtime implementation detail.

### Group external boundaries as narrow capabilities

Object storage uses put/get/delete/read-URL operations over binary streams and
metadata; cache uses best-effort get/set/delete; site builds have a fixed
request/result boundary; clocks and IDs are deterministic-test seams. Opaque
tokens are passed into a password-hash/verify capability, with persistence-facing
commands receiving only the verifier. Dispatcher operations explicitly claim,
renew or finish a time-bounded lease so an adapter can enforce a single owner.

Alternative considered: embed vendor SDKs, token plaintext, or scheduling loops
in the application package. Rejected because these make the core runtime-bound
and mix the later outbox worker's operational behavior into Session 4B.

### Make fakes an invariant-enforcing reference adapter

`@lacecms/test-utils` will expose deterministic clock/ID, storage, cache,
trigger, token, dispatcher, and content-store fakes. The content fake maintains
private maps/indexes for entries, page singleton ownership, and published routes;
it checks all guards before replacing any map/index so a failed command has no
partial effects. It uses the domain entry transition functions and clones/freeze
values at input/output boundaries. Cursor tokens are opaque but deterministic,
and all cursor validation is local to the fake contract.

Alternative considered: loose spy stubs. Rejected because they cannot discover
the concurrency and immutability contract drift that Step 5 must preserve.

## Risks / Trade-offs

- [The port surface could preempt a Session 4C use-case decision] → Limit it to
  roadmap-listed operations and use input/result types rather than prescribing
  orchestration policy or REST shapes.
- [In-memory and SQL/D1 behavior can drift] → Make conflict, atomicity, route,
  singleton, cursor, and detachment cases contract tests that later persistence
  adapters reuse.
- [Plain object maps can accidentally retain caller references] → Clone and
  deep-freeze every persisted/publicly returned domain aggregate and add mutation
  regression tests.
- [A hash implementation may imply a specific deployment secret policy] → Keep
  the port password-safe and defer credential creation, rotation, and endpoint
  authorization to the authentication/build-token sessions.

## Migration Plan

No persisted state or public HTTP API exists yet. Add package exports and tests,
then have Session 4C consume only the application contracts. Reverting removes
the ports and fakes without data migration; once Step 5 adapters exist, their
contract tests make any replacement deliberate.
