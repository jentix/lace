# content-use-cases Specification

## Purpose

Defines portable content-entry application behavior that authorizes callers,
validates complete aggregates, and coordinates lifecycle changes consistently
before Node or Cloudflare transport and persistence adapters are introduced.

## Requirements

### Requirement: Authorized content-entry lifecycle use cases
The system SHALL expose transport-neutral use cases for creating, listing,
loading, fully saving, publishing, and deleting content entries through the
portable application ports. Creating, saving, publishing, and deleting SHALL
authorize the actor before state is read or changed: creation and save require
`content:write`, publication requires `content:publish`, and deletion requires
`content:publish` when the entry has a current published snapshot and
`content:write` otherwise. Listing and loading an entry or its snapshots SHALL
require `content:read`. Authorization failure SHALL use the stable domain
authorization error and SHALL not invoke a state-changing port.

#### Scenario: Editor can manage an unpublished draft but cannot publish it
- **WHEN** an editor creates or saves an unpublished entry and then requests
  publication
- **THEN** creation and save succeed through the respective content commands,
  while publication fails with the stable authorization error before publication
  state changes

#### Scenario: Viewer can inspect but cannot mutate content
- **WHEN** a viewer requests a list or entry load, then requests draft save,
  publication, or deletion
- **THEN** the reads return portable content values, while every mutation fails
  with the stable authorization error and no content command executes

#### Scenario: Deleting public output requires publish authority
- **WHEN** an editor requests deletion of an entry that has a published snapshot
- **THEN** deletion fails with the stable authorization error and the public
  snapshot and route remain available

### Requirement: Complete aggregate validation precedes each lifecycle write
The system SHALL resolve the entry's normalized model and runtime block registry
before a create, complete-draft save, or publish command. Create and save SHALL
validate the complete draft aggregate in draft mode; publish SHALL revalidate the
current complete draft in publish mode before it resolves a route or invokes its
guarded publication command. Validation SHALL apply the model and block
semantics, allowed block types and current versions, field defaults, title/slug,
unique ordered block keys and positions, shared block/count/UTF-8-byte limits,
and all referenced media identifiers. A media reference is valid only when its
metadata exists and is active. For every accepted complete draft, the use case
SHALL rebuild the entire relational media-reference projection from the
normalized model fields and normalized block fields, with `$fields` or the
stable block key and a field path for each reference; it SHALL not retain stale
references or ask an adapter to discover references by parsing arbitrary JSON.
Any validation failure SHALL leave the stored entry, public route, and public
projection unchanged.

#### Scenario: Draft save rejects an invalid complete aggregate atomically
- **WHEN** a writer saves a draft with an unknown field, disallowed block,
  duplicate or unordered block key/position, missing or inactive media item, or
  an exceeded shared payload limit
- **THEN** the save fails before the atomic save command and the previously
  stored draft revision and content remain unchanged

#### Scenario: Publish applies stricter required-field validation
- **WHEN** a valid incomplete draft omits a publish-required model or block
  field, or a collection slug
- **THEN** draft save remains permitted but publication fails before route
  resolution and public content remains unchanged

#### Scenario: Valid draft values are normalized before persistence
- **WHEN** a writer saves a complete valid draft whose model or block fields
  omit descriptor defaults
- **THEN** the atomic save receives the normalized aggregate with those defaults
  applied and advances the draft revision exactly once

#### Scenario: Replacing a draft rebuilds media references
- **WHEN** a writer saves a valid complete draft that adds, removes, or replaces
  media fields in its model fields or blocks
- **THEN** the atomic save receives exactly the media-reference projection for
  the normalized submitted aggregate, without stale references from the prior
  draft

### Requirement: Publication is guarded, idempotent, and build-independent
The system SHALL publish only after strict validation and shall resolve the
candidate public route before invoking one guarded atomic publication operation.
The operation SHALL use the caller's expected draft revision, a new publication
snapshot identity, and the application clock time. A conflicting route,
singleton, or stale revision SHALL fail without a partial publication. A
non-empty idempotency key scoped to the same content entry and authenticated
actor SHALL return the original successful publication result when retried and
MUST NOT create another published snapshot, increment public content version,
or issue another build trigger. Reusing that scope/key with materially different
publication input SHALL fail without changing content. Publication success SHALL
be reported independently from build-trigger acceptance: an unavailable or
rejected build trigger SHALL not undo, obscure, or retry the successful
publication.

#### Scenario: Route conflict leaves published content untouched
- **WHEN** a publish candidate resolves to a route owned by a different entry
- **THEN** publication fails with the stable route-conflict error and neither
  entry's public snapshot, route ownership, or public content version changes

#### Scenario: Retry returns a publication once
- **WHEN** a publisher retries an already successful publication with the same
  entry, actor, idempotency key, and input
- **THEN** it receives the original publication result, the existing published
  snapshot remains current, and no additional build trigger is requested

#### Scenario: Build dispatch failure does not roll back publication
- **WHEN** guarded publication succeeds but the site-build trigger rejects or
  throws for the resulting public version
- **THEN** the use case reports the publication as successful with its separate
  build-dispatch outcome and public reads return the new immutable snapshot

### Requirement: Reads return detached portable content values
The system SHALL return only portable domain/configuration values from content
entry list and load use cases. Loads SHALL support the entry aggregate and its
individual draft or published snapshot; lists SHALL preserve the opaque cursor
contract. Returned values SHALL be detached from later caller mutation and from
future draft saves.

#### Scenario: Published read remains isolated after a subsequent draft edit
- **WHEN** an entry is published, its published snapshot is read, and a later
  complete draft save changes the title, fields, slug, or blocks
- **THEN** the previously returned and subsequently loaded published snapshots
  retain the original values while the draft has exactly one newer revision

### Requirement: Entry-list queries and editor names are authorized reads
The content-entry list use case SHALL require `content:read` before reading
state, SHALL resolve the model from the active configuration, and SHALL pass
the model's configured `listFields` (none for a page), the search term, the
status filter, and the sort, defaulting to `-updatedAt`, to the read port. It
SHALL reject an unknown model, an unsupported status or sort, and a trimmed
search term longer than 200 characters with the stable invalid-state domain
error before querying. It SHALL return a detached page including per-status
totals. A separate editor-description use case SHALL require `content:read`
and SHALL return an actor's `id` and display name through the read port. It
SHALL apply the same `System` and `Unknown user` fallbacks as list summaries.

#### Scenario: A viewer lists entries with a filter
- **WHEN** a viewer lists a collection with `status` `published` and a search
  term
- **THEN** the read port receives the model's list fields, the trimmed term,
  the status, and the default sort, and the viewer receives a detached page
  with totals

#### Scenario: Every role reads the same list data
- **WHEN** a viewer, an editor, and an administrator issue the same list query
  and describe the same editor
- **THEN** each receives identical items, totals, and display name, because
  each role holds `content:read`

#### Scenario: An invalid list query fails before a read
- **WHEN** a caller requests an unknown model, an unsupported sort, or an
  over-long search term
- **THEN** the use case fails with the invalid-state domain error and the read
  port is not queried
