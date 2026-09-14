## Context

See [proposal.md](./proposal.md) for motivation and the delta specifications for
observable behavior. Session 6A placed the portable planner in
`@lacecms/application`: it derives immutable operations from normalized models
and detached `StoredContentModelState` records, but intentionally has no
repository mutation surface. The existing SQLite schema already cascades a
`content_models.key` update to `content_entries.model_key`, enforces page
singleton cardinality, and coalesces pending build outbox events. The Node
repository already uses specialized SQLite transactions and the same
published-state/outbox sequence for publication.

## Goals / Non-Goals

**Goals:**

- Add portable synchronization state-read, dry-run, and guarded-apply contracts
  without database row types or a generic transaction callback.
- Make the Node SQLite adapter verify an approved plan against fresh state
  inside its transaction before executing all operations.
- Reuse normalized runtime models only to materialize new page drafts; preserve
  default semantics from the configuration package.
- Use the existing relational cascade and outbox uniqueness constraints rather
  than adding schema columns or duplicating lifecycle logic.

**Non-Goals:**

- No executable `lace content sync` command, configuration-file loader,
  transport/admin endpoint, Cloudflare/D1 adapter, or schema migration.
- No automatic field/content transformation, publication of generated page
  drafts, or creation of collection entries.
- No generic repository transaction abstraction or attempt to serialize an
  application `IdGenerator` into a persistence implementation.

## Decisions

### Preserve plan-review semantics with a guarded input snapshot

`@lacecms/application` will define a narrow read port that returns detached,
ordered `StoredContentModelState` values, plus a narrow command port whose
input contains the normalized models, the approved plan, its exact stored-state
snapshot, timestamp, system actor, and pre-generated draft entry/snapshot IDs
for the page creates. An application-level coordinator can use the same read
port and planner for dry-run reporting, draw deterministic IDs from the
application `IdGenerator`, and issue the command only for a valid plan.

The adapter starts a write transaction, reloads the state with the same summary
query, checks it against the expected snapshot and re-plans with the supplied
normalized models. It rejects when either the current summary or canonical plan
differs from the approved input. This protects plan review from concurrent
writes while keeping the planner as the one source of classification rules.

Alternative considered: let the adapter accept only normalized models and make
all planning decisions internally. Rejected because callers could not inspect
and approve the exact proposed actions before applying them, and dry-run/apply
parity would be weaker.

### Execute only planner-approved operations in one specialized mutation

The SQLite adapter will reject invalid plans and operation discriminants that
are not executable (`blocked-removal`, `incompatible-change`). It will then
perform creates, projection/versions updates, explicit renames, and safe
removals in deterministic plan order. Each row mutation carries a fresh guard
on the identity fields expected by the plan; zero affected rows becomes a stale
plan failure. A rename updates only when the former key remains present and the
target remains absent. SQLite's `ON UPDATE CASCADE` carries the key into
entries; no copying or transient replacement model is used.

Alternative considered: delete/create replacement rows for renames. Rejected
because populated models are protected by foreign keys and this would make a
partial loss or accidental inferred rename easier.

### Construct new page drafts from normalized configuration at the boundary

For each `create` operation whose normalized model is a page, the coordinator
will supply a pre-generated entry and draft-snapshot ID. The Node adapter writes
the model, one singleton `content_entries` row, and one draft snapshot using
the page's normalized field defaults, `{}` fields when no defaults exist,
empty blocks, `NULL` slug, the current model label (falling back to its stable
key when no optional label is configured) as title, config version as schema
version, and `system:content-sync` audit values. Required fields may be absent
because this is a draft. A model's kind and supplied operation are re-validated
before this materialization.

Alternative considered: call the existing entry create command after model
sync. Rejected because it would split one required atomic operation and could
commit a page identity without its singleton.

### Treat public configuration changes as one build-visible transaction result

All committed operations that change a public configuration projection (create,
label update, version update, rename, and removal) set one transaction-local
flag. If set, the adapter advances `published_state` once and invokes the
existing internal outbox-coalescing SQL with no publication snapshot ID. It
does not advance public state for a valid no-op, and it relies on the unique
pending-build index plus guarded update so multiple changes in the same apply
still leave one event targeting the one new version.

Alternative considered: enqueue one build event per model operation. Rejected
because it violates the existing coalescing and makes the public version
ambiguous for one atomic configuration apply.

### Keep in-memory support scoped to portable coordination tests

`@lacecms/test-utils` will expose the same state-read/apply behavior in the
in-memory content store, including detached data, stale-plan rejection, page
singleton materialization, public-version changes, and no-op behavior. SQLite
tests remain the authority for transaction rollback and concurrent connection
coverage; in-memory tests cover application-level dry-run and contract shapes.

Alternative considered: omit the in-memory implementation. Rejected because
the application port would lose its existing parity double and portable tests
could not exercise dry-run versus apply semantics.

## Risks / Trade-offs

- [An operator approves a plan that becomes stale] → compare the exact summary
  and recomputed plan inside the write transaction; reject rather than merge.
- [Page-default materialization drifts from config validation] → consume only
  normalized runtime fields and reuse their canonical default representation;
  add tests for defaulted and required-but-absent values.
- [Multiple connections contend on SQLite] → use a guarded transaction and
  test independent connections so one commit wins and the loser leaves no
  duplicate event or partial content.
- [A statement fails after public state changes] → retain all model, entry,
  state, and outbox writes inside the same transaction and inject checkpoints.
- [Cloudflare implementation diverges later] → keep SQL rows and interactive
  transactions behind portable contracts; a later D1 adapter can use equivalent
  guarded batch statements.

## Migration Plan

1. Add portable contracts/coordinator and in-memory parity tests without
   changing the persisted schema.
2. Implement the Node state summary query and guarded transaction using the
   existing schema cascade, singleton index, published-state row, and outbox
   coalescing rules.
3. Add focused Node tests for dry run, every executable operation, generated
   page singleton values, repeat apply, injected rollback, and two-connection
   stale-plan behavior.
4. Run focused and repository quality checks, validate the change strictly,
   synchronize accepted deltas, and archive it. Rollback before deployment is a
   code rollback; a committed compatible sync remains a forward-only data
   change and must be reversed with an explicit reviewed configuration plan.
