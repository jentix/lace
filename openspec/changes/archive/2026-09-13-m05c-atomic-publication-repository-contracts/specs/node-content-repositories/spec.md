## ADDED Requirements

### Requirement: Node publication preserves the guarded public projection atomically
The Node persistence adapter SHALL implement a specialized guarded publication
operation with the same observable statement ordering and all-or-nothing result
as the architecture-defined D1 batch. It SHALL create a distinct immutable
published snapshot only when the requested draft revision remains current; copy
the complete ordered block set and validated media-reference projection from the
draft; replace the entry's prior route with the resolved route; update the
published pointer; advance the global published version; persist an idempotency
result when supplied; and remove the superseded published snapshot. A guarded
failure, route collision, relational failure, or fault at any transaction
checkpoint SHALL leave the previous entry, routes, projections, public version,
outbox rows, and idempotency records unchanged.

#### Scenario: Publication atomically replaces an earlier public snapshot
- **WHEN** a current complete draft is published after the same entry already
  has a published snapshot
- **THEN** public reads resolve only the new immutable snapshot and route, its
  blocks and media references equal the published draft projection, the prior
  published snapshot and dependent rows are removed, and the draft remains
  independently mutable

#### Scenario: A stale publication guard causes no partial writes
- **WHEN** publication uses an expected revision that no longer matches the
  entry's draft
- **THEN** it returns the stable revision-conflict failure and creates no
  snapshot, route change, public-version change, outbox event, or idempotency
  record

#### Scenario: A route collision rolls back publication
- **WHEN** publication resolves to a path currently owned by another entry
- **THEN** it returns the stable route-conflict failure and both entries retain
  their previous public snapshots, routes, and reference projections

### Requirement: Node publication retains idempotency and coalesces build work
The Node persistence adapter SHALL scope a publication idempotency key to its
entry and publishing actor, retain the successful complete response atomically
with the public projection, and return that response for an identical retry.
It SHALL reject reuse of the same scope/key with different publication input
without changing stored state. Each successful public-projection mutation SHALL
advance the public version and create or update at most one pending, unlocked
`site.build.requested` outbox event for the newest version; it SHALL not alter a
claimed event. An idempotent replay SHALL not advance the version or create or
modify an outbox event.

#### Scenario: Identical retry replays one committed publication
- **WHEN** a publisher repeats a successful publication with the same entry,
  actor, idempotency key, and complete request input
- **THEN** the adapter returns the original result as a replay without another
  published snapshot, version increment, or build request

#### Scenario: Pending build work is coalesced while claimed work is preserved
- **WHEN** multiple successful publications occur before an existing unlocked
  build event is claimed
- **THEN** one pending event represents the latest public version; and when an
  earlier event is claimed, a later publication creates a separate pending event
  rather than modifying the claimed event

### Requirement: Node entry deletion and media deletion marking preserve durable boundaries
The Node persistence adapter SHALL delete an entry atomically. For an entry with
a current published snapshot, it SHALL remove the public route, advance the
global public version, and create or coalesce build work in the same mutation;
schema cascades SHALL remove its snapshots, blocks, and media-reference rows.
It SHALL refuse direct media deletion while any reference projection exists.
For unreferenced active media, it SHALL atomically mark the media `deleting` and
enqueue one non-coalesced `media.delete.requested` event; it SHALL not delete
binary data or metadata as part of this operation.

#### Scenario: Deleting published content removes its public projection
- **WHEN** a current published entry is deleted
- **THEN** its route and all entry-owned snapshots, blocks, and media references
  are absent, its model remains, the public version advances once, and a build
  request is pending

#### Scenario: Referenced media cannot be marked for deletion
- **WHEN** media is referenced by a draft or published snapshot
- **THEN** the deletion-marking operation fails and retains the media status
  without creating a deletion event

#### Scenario: Unreferenced media receives independent deletion work
- **WHEN** an active media item has no reference projection and is marked for
  deletion alongside another eligible item
- **THEN** both media rows become `deleting` and each has its own pending
  `media.delete.requested` event
