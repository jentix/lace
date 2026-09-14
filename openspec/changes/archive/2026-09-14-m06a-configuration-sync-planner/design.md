## Context

See [proposal.md](./proposal.md) for motivation. `@lacecms/config` has already
normalized and sorted models, with distinct structural and projection hashes;
it currently includes `renamedFrom` in those hashes even though the architecture
requires that temporary synchronization hint to be removable after migration.
The Step 5 schema persists only `content_models` identity fields; entries and
snapshots are relationally attached through its key. The current application
`ModelSyncPort` and in-memory store provide a coarse added/changed/removed
inspection plus replacement apply, which cannot express the architecture's
safety constraints or the Session 6A reporting outcome.

## Goals / Non-Goals

**Goals:**

- Keep `renamedFrom` available on normalized runtime models while excluding it
  from model and whole-configuration identity-hash inputs.
- Define detached, portable planner input records that add entry and snapshot
  cardinality to the persisted identity information already represented in the
  application package.
- Make comparison, validation, operation ordering, report rendering, and check
  exit classification pure application behavior shared by Node and Cloudflare.
- Preserve a small future persistence boundary: Session 6B consumes an approved
  plan and owns atomic key migration, page singleton creation, public-state
  advancement, and build enqueueing.

**Non-Goals:**

- No SQLite/D1 writes, schema migration, executable `lace.config.ts` loading,
  CLI command wiring, content transformation, page creation, or outbox change.
- No attempt to infer field compatibility from hashes, rename models without a
  valid hint, or support arbitrary content migrations.
- No REST/admin exposure, authorization policy, or Cloudflare adapter.

## Decisions

### Keep the planner in `@lacecms/application` and make persistence describe state

The planner will receive normalized `@lacecms/config` models and a portable
stored-state snapshot: model identity plus entry, draft-snapshot, and
published-snapshot counts. It will return frozen data-only plan operations and
diagnostics. It will not query a repository itself. This keeps the comparison
identical under SQLite and D1, preserves the architecture's application-to-
config dependency, and lets Session 6B add one specialized repository read/apply
operation without leaking rows or SQL into the planner.

Alternative considered: implement comparison in `NodeContentRepository` and
port it later to D1. Rejected because planner behavior would diverge by runtime
and the resulting API would expose persistence concerns to configuration code.

### Make `renamedFrom` operational metadata, not configuration identity

`@lacecms/config` will retain `renamedFrom` in the normalized runtime model so
the planner can explicitly match a former key. Its model-hash projection and
the public whole-configuration projection will omit that property before
canonical JSON hashing. Therefore adding the hint for a migration and removing
it after every environment has applied the rename do not alter either hash.

Alternative considered: require an additional version bump after removing the
hint. Rejected because the persisted model can have draft or published snapshots
and the planner correctly blocks structural changes in that case; a temporary
operational hint must not make normal cleanup impossible.

### Use a precedence-ordered per-model decision table

The planner will first validate duplicate/ambiguous input identity evidence,
then resolve explicit renames, then compare matched current keys. It will sort
current keys and residual stored keys lexicographically, producing a stable
operation/diagnostic order regardless of input order. For a matched identity,
kind mismatch and version regression are invalid; a changed structural hash
requires an increased version and is blocked if any draft or published snapshot
exists; equal structural hash with an unchanged version and changed projection
is label-only; an increased version that passes snapshot safety is compatible.
Residual stored identities become safe removal operations only if empty,
otherwise blocked removals. A valid rename is allowed for a populated model
only when its kind matches and the associated structural transition is
snapshot-safe.

This intentionally treats hashes as identity evidence rather than a general
schema diff: the old normalized field definition is not persisted, so claiming
field-level compatibility would be unsound. The structured diagnostics will
include model keys, former keys where applicable, hash/version mismatch class,
and draft/published counts so a future content-migration tool can make an
explicit decision.

Alternative considered: compare arbitrary JSON projections to identify
compatible optional-field changes. Rejected because historical projections are
not stored, the architecture requires no silent migration, and it would create
different semantics from the portable hash contract.

### Represent reporting as a projection of one canonical plan

One immutable plan object will be the source for JSON and text renderers. JSON
will be plain data with an explicit stable schema; text will iterate the same
sorted records and avoid timestamps, environment values, color codes, or
insertion-order output. Check mode will derive its exit status from plan
validity and whether operations are non-empty, and will never call a mutation
port.

Alternative considered: let each CLI/runtime format its own planner results.
Rejected because CI output and operator decisions would vary across runtimes;
the actual CLI entry point is deferred to Step 15.

### Replace the temporary sync inspection surface rather than layering aliases

`ModelSyncInspection` cannot describe legal vs blocked work, snapshots,
renames, or a report. Session 6A will retire the placeholder inspection/apply
types and in-memory blind model replacement in favor of planner-specific types,
functions, and fixture helpers. Session 6B will add a distinct specialized
apply contract that accepts an approved portable plan; it must revalidate its
read guard atomically rather than trusting a stale plan.

Alternative considered: retain old types and add optional fields. Rejected
because an incomplete report could be mistaken for a safe apply and optional
fields would conceal behavior that must be exhaustive in TypeScript.

## Risks / Trade-offs

- [Historical field projections are unavailable] → Use hashes, versions, and
  snapshot counts only; report structural incompatibility rather than guessing
  an automatic migration.
- [A plan can be stale before Session 6B applies it] → Treat the planner as
  advisory and require the later repository operation to guard/re-read the
  stored identity set atomically.
- [Human output becomes a de facto automation API] → Offer JSON as the stable
  machine representation and keep human text deterministic but informational.
- [Legacy consumers compile against `ModelSyncPort`] → Update the in-memory
  parity double and focused tests in this session; no released public package
  compatibility promise exists in the MVP workspace.
- [A public configuration consumer relies on `renamedFrom`] → Keep the hint in
  the runtime normalized model but exclude it from public/hash projections; the
  hint is specified as temporary synchronization metadata, not public schema.

## Migration Plan

1. Update configuration hash construction and tests so adding/removing a valid
   `renamedFrom` hint preserves model and whole-config identities.
2. Add planner input/output/report contracts and exhaustive pure comparison
   tests in `@lacecms/application`.
3. Update the in-memory fixture to provide deterministic persisted-state input
   rather than a blind synchronization apply, and adapt its focused tests.
4. Run focused package tests plus repository quality gates. The change has no
   persisted data mutation or schema migration, so rollback is a code rollback.
5. In Session 6B, introduce a guarded specialized repository read/apply path;
   deployments do not use a planner result as an authorization to bypass the
   fresh persistence guard.
