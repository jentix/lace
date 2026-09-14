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
