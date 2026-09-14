## Why

The configuration package already produces stable normalized model hashes and
SQLite already persists model identities, but the two are not yet reconciled
safely. Roadmap Step 6 / Session 6A adds the portable decision layer needed to
tell an operator exactly which configuration changes are safe, blocked, or
require a later atomic apply before the CMS serves configuration-dependent
traffic.

## What Changes

- Implement roadmap **Step 6, Session 6A — Planner** as a pure configuration
  synchronization planner over normalized configuration and stored model
  identity/snapshot summaries.
- Classify each model change deterministically as create, label-only update,
  compatible version update, explicit rename, safe removal, blocked removal, or
  incompatible change; detect invalid plans before any persistence operation is
  attempted.
- Enforce the architecture's kind, version, structure-hash, explicit-rename,
  removal, and existing-draft/published-snapshot safety rules.
- Exclude the temporary `renamedFrom` synchronization hint from configuration
  identity hashes so removing it after a completed rename does not look like a
  structural content change.
- Add stable human-readable and JSON plan reports, including a check-mode result
  that signals both invalid plans and pending work without mutating state.
- Replace the placeholder synchronization inspection contract and its
  in-memory parity behavior with planner-shaped portable values and tests.

## Capabilities

### New Capabilities

- `configuration-synchronization`: deterministic, non-mutating planning and
  reporting of safe configuration-model identity reconciliation.

### Modified Capabilities

- `application-ports-and-commands`: replaces the coarse model-sync inspection
  contract with portable configuration-sync planning inputs and outcomes.
- `content-model-configuration`: treats `renamedFrom` as operational-only
  metadata outside structural and projection identity hashes.

## Impact

- Affected code: `packages/config`, `packages/application`, and
  `packages/test-utils`; focused unit tests for identity hashes, plan
  classification, diagnostics, report serialization, and immutable parity
  values. `packages/platform-node` / `packages/db` supply the persisted shape
  but receive no writes in this session.
- Externally visible outcome: callers can produce deterministic text or JSON
  reports and a non-zero check result for a needed or invalid configuration
  synchronization, before a future apply command commits anything.
- Architectural basis: `docs/mvp-architecture.md` sections 4.3, 4.4, 4.7, and
  8; roadmap Step 6 / Session 6A; accepted
  `content-model-configuration` and `application-ports-and-commands` specs.
- Dependencies: completed Steps 3–5, especially normalized structural and
  projection hashes and the `content_models` / snapshot schema. Session 6B
  atomic apply, CLI wiring, content migrations, build enqueueing, REST, and
  Cloudflare persistence are explicit non-goals.
