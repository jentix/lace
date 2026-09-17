## Context

See `proposal.md` for motivation. The existing media command transaction already
changes an eligible row to `deleting` and appends `media.delete.requested` to
`outbox_events`; the schema already has event attempts, availability, lock, and
sanitized-error columns. The application lease port and in-memory double define
only a minimal claim/complete shape, and Node composition starts no background
dispatcher. The existing media schema already provides a nullable sanitized
diagnostic column that a retry clears before enqueueing fresh work.

The architecture requires binary bytes to remain in R2/MinIO (§4.6), public
content to remain immutable (§4.7), and infrastructure-specific work behind
narrow capability interfaces (§4.5). The accepted media and persistence specs
require active-only reference selection and asynchronous deletion.

## Goals / Non-Goals

**Goals:**

- Make media object removal restart-safe despite the unavoidable boundary
  between an object-store call and a SQLite transaction.
- Establish a reusable portable outbox contract while delivering only the
  media-deletion handler in this session.
- Preserve reference integrity for every ordering of content save, deletion
  request/retry, lease recovery, and finalization.
- Give operators a safe, authorized retry path and an actionable sanitized
  terminal state.

**Non-Goals:**

- Dispatching `site.build.requested`, adding a generic job dashboard, Cloudflare
  Workers/R2 scheduling, bulk deletion, object restoration, or a media trash.
- Atomic distributed transactions with MinIO, signed/public bucket URLs,
  deletion of unknown orphan keys, or automatic repair of objects written by a
  failed upload metadata insert.

## Decisions

### Lease one durable event through conditional SQLite updates

`@lacecms/application` will refine the dispatcher capability around explicit
claim and conditional completion/failure inputs. `NodeContentRepository` will
implement the capability using an immediate SQLite transaction: choose a
bounded deterministic batch of pending or expired-lock rows, and conditionally
set a newly generated opaque lease ID and lock timestamp for each selected
event. Every success, retry, and terminal completion will require that same
lease ID and an unexpired lock, so an old process cannot finish work recovered
by another process.

Leases last exactly 60 seconds. A dispatcher handles one bounded batch at a
time; its loop never overlaps an outstanding run. This uses existing outbox
columns (`attempts`, `available_at`, `locked_at`, `locked_by`, `processed_at`,
and `last_error`) and introduces no event-table migration.

Alternatives considered:

- A process-local queue: rejected because restart and multi-process recovery
  would be impossible.
- A long-running SQLite transaction across the MinIO request: rejected because
  it holds a write lock while waiting on the network and cannot survive a
  process crash.
- Claiming with a select followed by an unguarded update: rejected because two
  workers could both process the same event.

### Use a finite, jittered retry policy with a terminal media state

The portable dispatcher will use an injected policy with defaults of eight
total attempts, a one-second base delay, a fifteen-minute maximum delay, and
full jitter. The implementation will make the random-delay seam deterministic
in tests. A retriable storage failure increments attempts once and schedules a
delay no greater than the cap. The eighth failure marks the event terminal and
updates the media row to `delete_failed` with a short sanitized failure class;
both updates are committed together. The event keeps its attempt count and
terminal error for operations visibility.

Retries clear the existing nullable `media.last_error` when they atomically
return an unreferenced row to `deleting` and enqueue fresh work. Transport metadata keeps
the established public shape: status exposes operator actionability, while the
diagnostic stays out of general media DTOs and logs never contain credentials,
keys, or raw SDK errors.

Alternatives considered:

- Unbounded retries: rejected because permanent configuration errors would
  consume resources forever without an operator-visible terminal state.
- Retrying at a fixed interval: rejected because synchronized storage outages
  create avoidable request bursts.
- Exposing raw storage errors in admin JSON: rejected because they can disclose
  endpoints, credentials, or implementation details.

### Make external object deletion idempotent before metadata finalization

`@lacecms/platform-node` will provide a media-deletion dispatcher that accepts
claimed portable events, verifies the small typed payload, loads the deleting
row through a private finalization port, calls `ObjectStorage.delete`, and only
then completes a guarded SQLite finalization. The MinIO adapter treats an absent
object as a successful deletion. If the process dies after the object call but
before the database completion, the recovered event calls delete again and
obtains the same safe end state.

Finalization's transaction deletes the media row only with both predicates:
`status = deleting` and no `content_media_references` row. A reference conflict
is classified as a safe, visible failure rather than deleting metadata. Normal
reference protection means it should only arise from work that committed before
the deletion transition; it is retained as a defensive guard at this external
boundary.

Alternatives considered:

- Delete the database row before MinIO: rejected because it loses the object
  key needed for recovery and can orphan an object.
- Treat absent objects as failure: rejected because a crash after object success
  would prevent recovery forever.
- Delete the object inside a database transaction: rejected because the object
  store cannot participate in SQLite atomicity.

### Close reference races at the persistence boundary

Application media validation remains an early authorization/feedback check, but
is not relied on for concurrency. `NodeContentRepository.insertReferences` will
insert each projection only by selecting a currently `active` media row and
will fail the surrounding transaction when that conditional insertion cannot
occur. Conversely, delete/retry marking already predicates on the absence of
references in its own transaction. SQLite writer serialization gives the two
orders safe results: a committed reference makes marking fail, or a committed
mark makes the draft replacement roll back.

The in-memory content double will mirror this condition so portable tests do
not accept a sequence that Node SQLite rejects.

Alternatives considered:

- Depend on a pre-save `loadMedia` check: rejected because the media status can
  change between that read and the projection write.
- Let foreign keys alone protect the race: rejected because they prevent row
  deletion but do not stop a new reference to a deleting item.

### Run the Node loop after startup and drain it safely

`apps/api` will create the dispatcher from the Node repository, object storage,
clock, ID generator, logger, and retry policy after MinIO preflight succeeds.
It will begin an immediate bounded pass and schedule later passes without
overlap. Server shutdown will stop the scheduler before closing the listener,
await an in-flight pass for its bounded object-store timeout, then close SQLite.
Any uncompleted lease is deliberately recoverable after 60 seconds; shutdown
does not manufacture a failure result.

The server package adds only the authenticated retry route. It delegates to the
existing media use case and returns the existing accepted media DTO, preserving
the public stable URL and avoiding a new transport diagnostic surface.

Alternatives considered:

- Run a separate required worker process: rejected for this session because it
  expands the VPS topology and deployment contract beyond the roadmap unit.
- Dispatch in the DELETE HTTP request: rejected because the request would have
  unbounded latency and break recoverability on client disconnect.

## Risks / Trade-offs

- [An object can be deleted before a later metadata-finalization conflict] →
  reference writes accept only active media, marking is transactional, and the
  defensive finalization check retains metadata/event visibility rather than
  silently deleting a referenced row.
- [A 60-second lease can delay recovery after a crash] → it bounds duplicate
  work while remaining short compared with operator intervention; all object
  operations retain their existing timeouts.
- [A Node-local dispatcher does not cover Cloudflare] → its portable contracts
  and semantics are specified now; the Cloudflare adapter belongs to Step 14.
- [Terminal diagnostics are internal-only] → the established nullable column
  remains outside general media DTOs, while status provides the retry signal.

## Migration Plan

1. Add the portable dispatch/finalization contracts, retry scheduler, and
   deterministic doubles over the existing sanitized diagnostic representation.
2. Implement SQLite conditional claims, completions, terminal transition, and
   active-only reference insertion; cover concurrent interleavings with focused
   repository tests.
3. Add the Node dispatcher, composition lifecycle, retry HTTP route, generated
   OpenAPI update, and focused integration tests.
4. Run package tests, root quality gates, and strict OpenSpec validation.

Rollback is code-compatible: stop the dispatcher and deploy the prior version. Existing deleting rows and unfinished
outbox events remain durable for a later corrected deployment; no binary is
removed by rollback itself.
