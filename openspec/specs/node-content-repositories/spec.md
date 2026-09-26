# node-content-repositories Specification

## Purpose

Defines the Node SQLite persistence behavior for bounded content reads and
atomic draft writes before guarded publication and deletion are introduced.

## Requirements

### Requirement: Node content reads use validated, stable cursor boundaries
The Node persistence adapter SHALL return portable entry aggregates and bounded
cursor pages without database-row types. It SHALL encode continuation cursors as
base64url-encoded versioned JSON, validate the version and every value before
using a cursor as a query boundary, and reject malformed, unsupported, or
wrong-kind cursors without running an unbounded query. An admin model-entry
cursor's kind SHALL bind the model key, search term, status filter, and sort. It
SHALL be rejected for any other combination. It SHALL be ordered by the
requested sort key and then by entry ID in the same direction: `updated_at`,
case-insensitive draft title, or published snapshot `created_at` with
never-published entries treated as earliest. The default SHALL remain
`(updated_at DESC, id DESC)` and SHALL use the model-entry list index. A public
collection page SHALL be ordered by
`(published snapshot created_at DESC, entry id DESC)`. Neither cursor is an
authorization claim, and neither SHALL require a signature.

#### Scenario: Admin continuation retains its order
- **WHEN** an administrator reads a full page of model entries and passes its
  continuation cursor to the next bounded request
- **THEN** the next page contains only rows after the prior
  `(updated_at DESC, id DESC)` boundary with no duplicate row from that page

#### Scenario: Every admin sort pages without gaps or duplicates
- **WHEN** a caller pages a model's entries one row at a time by title, update
  time, or publication time in either direction, including equal titles and
  never-published entries
- **THEN** the concatenated pages contain every matching entry exactly once in
  the requested order

#### Scenario: Invalid cursor is rejected before a query
- **WHEN** a caller supplies malformed base64url data, unsupported cursor
  version, missing field, unsafe timestamp, a sort value of the wrong type, or
  a cursor for a different list, model, search term, status, or sort
- **THEN** the adapter rejects the request and does not treat its values as SQL
  query parameters

#### Scenario: Public collections have independent stable paging
- **WHEN** a caller pages published collection content that shares publication
  timestamps
- **THEN** the continuation boundary uses the published snapshot timestamp and
  entry ID so the result order is deterministic

### Requirement: Node adapters map to portable content values through permitted dependencies
The Node platform adapter SHALL be permitted to consume portable domain and
content values through their declared public package entry points when mapping
SQLite records to application contracts. Dependency enforcement SHALL continue
to reject reverse dependencies and cycles; shared schema/migration packages
SHALL NOT become owners of Node runtime row mapping solely to avoid this edge.

#### Scenario: Node repository passes architecture-boundary verification
- **WHEN** the Node repository imports the portable value constructors and JSON
  types needed to return application content contracts
- **THEN** the source-level boundary verification accepts those public-entry-point
  dependencies and still rejects a cycle or an undeclared cross-package import

### Requirement: Node draft writes are complete and atomic
The Node persistence adapter SHALL create an entry with exactly one mutable
draft and SHALL replace a complete draft only at its expected revision. A
successful complete-draft save SHALL replace its block rows, rebuild its
validated media-reference projection, update the draft values and actor/time,
and advance the draft revision exactly once in one SQLite transaction. A stale
revision, relational failure, or thrown statement SHALL leave the previous
draft, blocks, references, and revision intact. Publication mutation methods
SHALL NOT be available through this ordinary draft-write API.

#### Scenario: Save replaces the complete aggregate
- **WHEN** a writer saves a valid complete draft at its current revision
- **THEN** only the supplied ordered blocks and media references remain for the
  draft snapshot and its revision increases by one

#### Scenario: Failed projection rebuild rolls back the save
- **WHEN** insertion of a supplied media reference fails during a draft save
- **THEN** the stored draft fields, blocks, reference rows, and revision retain
  their pre-save values

#### Scenario: Stale save has no partial effect
- **WHEN** a writer saves using a revision that no longer matches the draft
- **THEN** the adapter returns the stable revision-conflict failure and performs
  no aggregate replacement

### Requirement: Public Node reads expose only current published projections
The Node persistence adapter SHALL resolve a canonical public route only through
its current published snapshot, return media metadata publicly only when a
reference from a current published snapshot exists, and produce a build export
from current published routes and snapshots. These reads SHALL use bounded
set-based retrieval that does not issue one query per entry, block, or media
reference.

#### Scenario: Draft-only data is not publicly readable
- **WHEN** an entry or media item is referenced only by a draft snapshot
- **THEN** public route, media, and build-export reads do not expose it

#### Scenario: Build export loads aggregates without N+1 queries
- **WHEN** a build export contains multiple published entries and ordered blocks
- **THEN** the adapter returns the complete aggregates through a bounded
  set-based query plan rather than issuing a separate query for each aggregate

### Requirement: Node public mutations are atomic
The Node persistence adapter SHALL atomically publish guarded drafts, replace routes, advance public state, coalesce build work, retain idempotent responses, delete entries, and mark only unreferenced active media for asynchronous deletion.

#### Scenario: Route collision rolls back publication
- **WHEN** a publication path is owned by another entry
- **THEN** routes and public projections remain unchanged

#### Scenario: Media deletion is asynchronous
- **WHEN** eligible media is marked for deletion
- **THEN** it becomes deleting with an independent event and no binary object deletion

### Requirement: Node configuration synchronization applies fresh plans atomically
The Node persistence adapter SHALL provide the portable configuration
synchronization read and guarded apply operations over SQLite. Its apply
operation SHALL re-check the supplied plan against stored model identity and
content cardinality within one SQLite transaction, perform all allowed model
identity changes and page-singleton creation, and roll back all effects on any
failed statement, stale guard, or concurrent conflict. It SHALL reuse the
schema's cascading model-key update for an explicit rename and the pending
site-build uniqueness rule for build coalescing.

#### Scenario: Atomic rename retains attached content
- **WHEN** a fresh valid synchronization plan explicitly renames a populated
  page or collection model to an unused key of the same kind
- **THEN** the transaction commits the new model key and every attached entry
  under that key, with no intermediate visible state or inferred replacement

#### Scenario: Concurrent apply permits one winner
- **WHEN** two Node callers try to apply plans derived from the same persisted
  state and one commits a model change first
- **THEN** at most one transaction commits that change and the other returns a
  stale-plan failure without overwriting data or creating a second build request

#### Scenario: Statement failure preserves all synchronization state
- **WHEN** a SQLite statement fails after the adapter has started a
  synchronization transaction
- **THEN** content models, singleton entries, published-state version, and
  pending build outbox rows retain their pre-apply values

### Requirement: Node persistence atomically protects media deletion races
The Node SQLite adapter SHALL atomically claim and complete media-deletion
outbox work, and SHALL retain expired leases for recovery. It SHALL transition
active or failed media to `deleting` and enqueue deletion work only while no
reference exists in the same transaction. A complete-draft write SHALL reject
any referenced media that is not active before replacing its projection. Media
finalization SHALL delete metadata only while it remains `deleting` and has no
reference; a conflicting save or deletion transition SHALL leave a recoverable
event and valid relational state rather than deleting referenced metadata.

#### Scenario: Draft save cannot select deleting media
- **WHEN** a complete-draft save identifies a media record already marked
  `deleting`
- **THEN** the save fails before changing its draft, block, or reference rows

#### Scenario: Reference and deletion marking compete
- **WHEN** one SQLite transaction commits a new valid media reference while
  another attempts to mark or retry that media for deletion
- **THEN** only the reference or the deletion transition commits, and no
  deletion event succeeds for media with the committed reference

#### Scenario: Finalization sees a competing reference
- **WHEN** media deletion finalization encounters a newly committed reference
- **THEN** it retains the media metadata and a durable recoverable or terminal
  deletion outcome without violating the media-reference foreign key

### Requirement: Node entry summaries derive state, totals, and editor names
The Node persistence adapter SHALL derive each admin entry summary's status by
comparing the current published snapshot's revision with the draft revision,
SHALL report the published snapshot's creation time as `publishedAt`, and SHALL
read `listValues` only from the requested list fields in the draft's stored
field values. It SHALL omit absent keys and non-scalar values. It SHALL resolve
the draft's last editor display name from the stored user name in the same
read, falling back to `System` for `system:` actors and `Unknown user` for
missing users. It SHALL compute per-status totals for the model and search term
in one aggregate read, independent of the status filter and cursor. The search
SHALL bind the term as a query parameter and match it as a literal substring,
not as a pattern.

#### Scenario: Totals and status agree after publication and edit
- **WHEN** an entry is published and its draft is then saved again
- **THEN** its summary reports `changed` with the publication time, and the
  totals move it from `published` to `changed` without changing `all`

#### Scenario: Search terms are literal
- **WHEN** a search term contains `%`, `_`, or a quote character
- **THEN** only entries whose draft title or slug contains those characters
  literally match, and the term never changes the SQL statement

#### Scenario: A missing editor still has a name
- **WHEN** a draft's `updated_by` names an actor with no user record
- **THEN** the summary's `updatedBy.displayName` is `Unknown user` and the
  list read succeeds
