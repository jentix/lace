## Context

See `proposal.md` for motivation. Steps 2 and 3 provide portable JSON, content
validation, a block registry, and normalized page/collection configuration;
`@lacecms/domain` is still a scaffold. Step 4A must make later application
ports, fakes, use cases, and SQLite/D1 adapters agree on CMS rules without
depending on any of them. Architecture sections 4.4, 4.7, 6, 8, 9.2–9.8, 10,
and 14 define the governing behavior.

## Goals / Non-Goals

**Goals:**

- Establish one portable TypeScript domain API for content state, authorization,
  routing, ordering, lifecycle transitions, and stable error mapping.
- Make every domain value readonly and detached at mutation/publication
  boundaries so published data cannot share mutable references with drafts.
- Keep policy rules pure and independently testable, leaving durable atomicity
  to specialized ports in Session 4B and their adapters in Step 5.

**Non-Goals:**

- Defining repository ports, transactions, fakes, use cases, validation
  orchestration, database rows/migrations, HTTP schemas, or Better Auth wiring.
- Adding a generic domain event framework, historical revisions, unpublish,
  nested block trees, or per-entry/collection ACLs.
- Replacing configuration validation; normalized model paths and routes remain
  configuration inputs, while the domain protects resolved runtime paths.

## Decisions

### Isolate vocabulary and rules in `@lacecms/domain`

The package will export branded string IDs/keys and readonly aggregate types
alongside narrow pure functions. It can import JSON/content primitives from the
public `@lacecms/content` entry point but will not import `@lacecms/config`, so
the architecture's one-way dependency graph remains valid. Consumers will pass
the normalized model information required for a rule rather than a config
package type. Reusing config's implementation by importing `@lacecms/config`
is rejected because it creates a forbidden domain-to-config edge; duplicating a
small defensive resolver is accepted because configuration and domain validate
at different boundaries.

### Use typed domain errors with a finite code union

Rules will throw or return one domain-error representation whose `code` is a
finite exported union. The initial set will distinguish permission denial,
invalid state, singleton/cardinality conflict, revision conflict, route
conflict, and immutable publication attempts. Adapters will later map those
codes to REST and persistence outcomes. Returning generic `Error` strings is
rejected because callers could not map failures consistently across SQLite and
D1.

### Model authorization as permissions, not roles in callers

The default matrix will be a complete readonly mapping from global roles to
permission sets. `requirePermission(actor, permission)` is the only policy
entry point used by future use cases. Direct role comparison is rejected since
it duplicates policy and makes additions or role changes unsafe.

### Make ordering explicit and sparse

Blocks retain their existing stable keys, type/version/data from content
validation and gain a domain position. The initial normalized sequence is
`1000, 2000, …`; an insertion computes an integer midpoint only when one is
available, otherwise marks the list for whole-list normalization. Normalization
renumbers in list order. Fractional positions are rejected because SQLite and
D1 must preserve identical ordering semantics without floating-point behavior.

### Treat publication as a detached snapshot boundary

A complete draft replacement constructs the next revision only after receiving
the whole aggregate. Publication deep-clones and deep-freezes fields and blocks
into a separate published snapshot; all later draft transitions create new
readonly aggregate values. Type-level readonly alone is rejected because
JavaScript callers could otherwise mutate nested data through retained
references. This pure construction validates the lifecycle in memory; Session
4B's specialized atomic port and Step 5's database constraints ensure the same
guarantee durably.

### Compare public-path owners globally

The domain route rule resolves page and collection paths from normalized model
data, then compares a candidate against the owning entry of an existing route.
The same entry may retain its route during replacement; a different owner is a
conflict. Model-time ambiguous-pattern checks remain in `@lacecms/config`, and
the eventual `published_routes.path` constraint is the final concurrent guard.

## Risks / Trade-offs

- [A duplicated defensive collection-route resolver could drift from config]
  → Share fixed fixtures and make domain tests cover the existing canonical
  path/slug contract; any divergent contract requires a reviewed spec update.
- [Deep cloning large JSON data adds allocation] → It occurs only at complete
  draft/publication boundaries, where the established one-megabyte JSON limits
  bound the work and immutability is more important than micro-optimizing.
- [Pure cardinality and path checks cannot eliminate races] → Preserve their
  explicit conflict results and require later specialized persistence operations
  and SQL constraints to enforce them atomically.

## Migration Plan

`@lacecms/domain` has no existing product API. Add the new exports and focused
unit tests, then let Session 4B adopt the types in ports and fakes. Reverting
the change removes only the package exports and its specification delta; it
requires no persisted-data migration.
