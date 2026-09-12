## Why

Step 4A established portable content rules, but no application-facing contract
yet expresses the atomic state operations those rules require or lets tests run
the forthcoming use cases without a database. Session 4B supplies those
contracts and faithful in-memory fakes before Session 4C adds orchestration.

## What Changes

- Add focused application read ports and specialized atomic command ports for
  configuration synchronization, content entry state, public content, and build
  export; explicitly exclude a generic cross-runtime transaction callback.
- Define application commands and results for model-sync inspection/application,
  entry creation, aggregate loading, cursor listing, complete draft replacement,
  guarded publication, deletion, public data listing, and build export.
- Add portable infrastructure capability contracts for object storage, derived
  caching, build triggering, clocks, ID generation, password-safe opaque-token
  hashing/verification, and dispatcher-event leasing.
- Provide in-memory test doubles that enforce the domain lifecycle, revision,
  route, singleton, and publication-immutability invariants at their command
  boundaries.

Scope is roadmap Step 4, Session 4B. This introduces application contracts and
test infrastructure only; Session 4C owns use-case orchestration, Step 5 owns
SQL/D1 adapters and migrations, and later sessions own REST DTOs, authentication
wiring, media workflows, outbox dispatch behavior, and runtime integrations.

## Capabilities

### New Capabilities

- `application-ports-and-commands`: Portable application commands, persistence
  and infrastructure capability ports, and invariant-preserving in-memory fakes.

### Modified Capabilities

- None.

## Impact

- Implements roadmap Step 4, Session 4B, preserving its boundary before the
  4C use cases and Step 5 persistence adapters.
- Follows architecture sections 4.5, 6, 9.2–9.8, 10, 14, and 15, particularly
  the specialized-atomic-operation requirement and the non-authoritative cache
  rule.
- Builds on accepted `content-domain-rules`, `content-model-configuration`,
  `content-validation`, and `block-registry` specifications without changing
  their requirements.
- Affects `@lacecms/application` and `@lacecms/test-utils`, adding their
  allowed dependencies on portable domain/configuration/content contracts and
  focused tests; no transport, framework, database, Node, or Cloudflare API is
  introduced.
