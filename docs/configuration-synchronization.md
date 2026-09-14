# Configuration synchronization planner

Step 6A provides the portable, non-mutating decision layer for reconciling
normalized `lace.config.ts` models with persisted model identities. It is shared
application behavior; the executable `lace content sync` command and its
atomic write path are introduced later.

The planner emits operations in stable key order:

- `create` creates a previously unknown model identity;
- `label-update` changes only the serializable display projection;
- `version-update` accepts a version increase, including a structural change
  when the model has no snapshots;
- `rename` requires a valid explicit `renamedFrom` key and compatible kind;
- `remove` is safe only for a stored model with no entries;
- `blocked-removal` and `incompatible-change` are never executable.

Invalid plans name a stable diagnostic code and affected model key. They cover
kind changes, version regressions, structural changes without a version bump,
structural changes with draft or published snapshots, unsafe removals, and
missing or ambiguous rename evidence. The planner never infers a rename from a
create/removal pair.

The same canonical plan produces deterministic human text and JSON reports.
Its check result is zero only for a valid no-op plan; a valid plan that needs
work and every invalid plan return non-zero. Planning and check mode do not read
or write an adapter through a mutation callback, change content, advance public
state, or enqueue a build.

`renamedFrom` remains available only to the normalized runtime model for this
planning step. It is excluded from public configuration projections and all
identity hashes, so it can be removed after a rename has reached every
environment without appearing as a structural content change. Session 6B will
re-read and guard stored state transactionally before applying any approved
plan; it does not perform automatic content migrations.

## Atomic apply boundary

Session 6B adds portable dry-run and guarded-apply contracts; the executable
`lace content sync` CLI and the Cloudflare adapter are still deferred. A caller
first reads persisted model summaries and renders the canonical plan. Apply
then supplies that exact summary and approved plan to one specialized
repository operation. The repository re-reads the summary and re-plans inside
its write transaction, rejecting an invalid or stale plan without any writes.
Reapplying unchanged configuration therefore becomes a valid no-op and neither
advances the public version nor creates build work.

The atomic operation may create, update, explicitly rename, or safely remove
model identities. A rename requires the plan's explicit `renamedFrom` evidence;
the Node implementation updates the model key and relies on the database's
foreign-key cascade for attached entries. Sync never transforms arbitrary
content or infers a replacement from an addition/removal pair.

When sync creates a page model, it also creates exactly one incomplete draft
singleton in the same mutation. The draft uses normalized field defaults, no
blocks, a `NULL` slug, `system:content-sync` audit values, and the configured
label as title (falling back to the stable model key when label is absent).
Collections never receive generated entries, and required fields without a
default remain absent until publication.

Every non-no-op applied plan changes public configuration as one unit: it
increments `published_state.version` once and creates or coalesces one pending
`site.build.requested` event for that new version. Any failed statement rolls
back model identities, generated page drafts, public state, and outbox work
together.
