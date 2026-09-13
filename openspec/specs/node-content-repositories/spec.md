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
wrong-kind cursors without running an unbounded query. It SHALL order an admin
model-entry page by `(updated_at DESC, id DESC)` and a public collection page
by `(published snapshot created_at DESC, entry id DESC)`; neither cursor is an
authorization claim and neither SHALL require a signature.

#### Scenario: Admin continuation retains its order
- **WHEN** an administrator reads a full page of model entries and passes its
  continuation cursor to the next bounded request
- **THEN** the next page contains only rows after the prior
  `(updated_at DESC, id DESC)` boundary with no duplicate row from that page

#### Scenario: Invalid cursor is rejected before a query
- **WHEN** a caller supplies malformed base64url data, unsupported cursor
  version, missing field, unsafe timestamp, or a cursor for a different list
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
