# rest-contracts Specification

## Purpose

Defines the versioned, runtime-validated REST data contracts and transport
conventions shared by Lace API implementations, clients, and documentation.

## Requirements

### Requirement: Shared versioned content DTOs
The system SHALL provide one shared runtime contract for the `/api/v1` content
surface. It SHALL validate request and response representations for content
models, including each model's serializable discriminated field-descriptor map
and allowed registered block-definition metadata; admin entry lists, entry
details, complete-draft saves, publications, and deletions; public page,
collection, path, media, and build-export reads; media metadata; site-build
state; cursor pagination; and the error envelope. Field and block metadata
SHALL represent only the supported portable field types and their portable
options, including defaults and constraints where present, and SHALL reject
unknown descriptor keys, executable values, or non-JSON values. Each model's
block-definition metadata SHALL correspond only to its declared allowed block
types and include the stable type, schema version, display metadata, field map,
and optional default data. The representations SHALL use JSON primitives and
objects only, SHALL expose content values through explicit DTOs rather than
persistence rows, and SHALL remain usable by both Node and Cloudflare API
implementations.

#### Scenario: A content response crosses a runtime boundary
- **WHEN** an API implementation returns an entry, public content, media
  metadata, build export, or site-build DTO that satisfies the shared contract
- **THEN** a client can validate the JSON payload without importing a database
  schema or a runtime-specific API package

#### Scenario: Model field metadata crosses a runtime boundary
- **WHEN** an API implementation returns a configured content model with text,
  textarea, rich-text, number, boolean, date, datetime, select, URL, or media
  field metadata
- **THEN** a browser client can validate the descriptor type and its portable
  options without importing server configuration code or executable validators

#### Scenario: Allowed block metadata crosses a runtime boundary
- **WHEN** an API implementation returns a configured content model that allows
  one or more registered blocks
- **THEN** a browser client can validate metadata for exactly those block types
  and render their portable fields without importing a server-side registry

#### Scenario: A malformed mutation is rejected before dispatch
- **WHEN** a client submits a create, draft-save, publish, or delete payload
  that is missing a required value, contains an unknown key, or supplies a
  value with the wrong JSON type
- **THEN** contract validation rejects it before an application mutation runs

### Requirement: JSON transport values retain stable representations
The system SHALL encode timestamps as ISO-8601 UTC strings, validate and
serialize them through shared transforms, and reject non-UTC or invalid date
strings. Cursors SHALL remain opaque non-empty transport strings; clients SHALL
not need to decode them. Shared contracts SHALL validate ETag and
idempotency-key header values used by their associated content operations. The
public build-export response SHALL use an ETag derived from the published-state
version; when a request supplies that current valid entity tag in
`If-None-Match`, it SHALL return `304 Not Modified` with the matching ETag and
no response body. A changed or absent valid entity tag SHALL produce the
validated build-export representation with its current ETag.

#### Scenario: A timestamp is serialized for JSON
- **WHEN** a portable content value contains a valid UTC timestamp
- **THEN** its response DTO exposes a canonical ISO-8601 UTC string and the
  corresponding request or response schema accepts that string

#### Scenario: An invalid transport primitive is supplied
- **WHEN** a request contains an invalid timestamp, empty cursor, malformed
  ETag, or empty or overlong idempotency key
- **THEN** shared contract validation reports a validation error without
  interpreting the value as an application command

#### Scenario: A conditional build export is current
- **WHEN** a client supplies the ETag for the current published-state version
  in `If-None-Match`
- **THEN** the API returns `304 Not Modified` with that ETag and an empty body

#### Scenario: A conditional build export is stale
- **WHEN** a client omits `If-None-Match` or supplies a valid ETag for an older
  published-state version
- **THEN** the API returns the validated build-export DTO and the current ETag

### Requirement: Mutable request preconditions are unambiguous
The complete-draft-save, publish, and delete contracts SHALL use a non-negative
integer `expectedRevision` in the JSON body as the canonical generated-client
precondition. They SHALL also accept an equivalent `If-Match` revision header
for HTTP clients. If both are supplied, their revisions SHALL match; a missing
body value may be supplied by `If-Match`, and a disagreement SHALL be rejected
as a validation failure before the operation reaches application code.

#### Scenario: Header and body revisions agree
- **WHEN** a client sends the same expected revision in the request body and
  `If-Match` header
- **THEN** the shared precondition parser produces that revision for the
  mutation command

#### Scenario: Header and body revisions disagree
- **WHEN** a client sends different revisions in the body and `If-Match`
- **THEN** the request is rejected with a stable validation issue and no
  mutation is attempted

#### Scenario: A stale deletion is rejected atomically
- **WHEN** a client requests deletion with an expected revision that no longer
  identifies the current draft, or when the entry's publication state changes
  after that revision was read
- **THEN** deletion fails with `CONTENT_REVISION_CONFLICT` and leaves the entry,
  public route, published state, and build work unchanged

### Requirement: Errors use stable sanitized envelopes
The system SHALL represent every transport failure as `{ error: { code,
message, details? } }`. Validation failures SHALL use `VALIDATION_FAILED` with
field issues whose paths use JSON Pointer notation; the envelope SHALL not
expose stack traces, SQL text, or validator-internal objects. Each existing
domain/application error SHALL map to exactly one stable status and code pair:
`AUTHORIZATION_DENIED` to `403`, `CONTENT_INVALID_STATE` to `422`, and each of
`CONTENT_MODEL_CARDINALITY_CONFLICT`, `CONTENT_PUBLISHED_IMMUTABLE`,
`CONTENT_REVISION_CONFLICT`, and `CONTENT_ROUTE_CONFLICT` to `409`, preserving
the same code as its machine-readable error code. The transport contract SHALL
also represent a missing API resource as `NOT_FOUND` with `404`, an exhausted
request limit as `RATE_LIMITED` with `429`, and an oversized request body as
`PAYLOAD_TOO_LARGE` with `413`.

#### Scenario: A revision conflict is reported safely
- **WHEN** an optimistic content mutation reaches an existing revision conflict
- **THEN** the API can return status `409` with code
  `CONTENT_REVISION_CONFLICT` and only documented conflict details

#### Scenario: Request validation fails safely
- **WHEN** validation rejects a submitted field or header
- **THEN** the API can return status `422` with code `VALIDATION_FAILED` and
  stable JSON Pointer issue paths without a stack trace, SQL text, or
  implementation-specific validator output

#### Scenario: A resource does not exist
- **WHEN** a caller requests an unknown API route or content resource
- **THEN** the API returns status `404` with code `NOT_FOUND` and a sanitized
  error envelope

#### Scenario: A request crosses an operational limit
- **WHEN** a caller exceeds a configured request-rate or body-size limit
- **THEN** the API returns the corresponding stable `RATE_LIMITED` or
  `PAYLOAD_TOO_LARGE` error envelope without disclosing limiter internals

### Requirement: Security administration contracts reveal secrets only once
The shared REST contracts SHALL validate setup-admin, user list/create/update,
and build-token lifecycle requests and responses. A token-creation response
SHALL contain the plaintext credential exactly once; all later representations
SHALL exclude it and contain only safe token metadata. Rate-limit responses
SHALL use the shared error envelope with code `RATE_LIMITED` and a positive
integer `Retry-After` header.

#### Scenario: Token metadata is listed
- **WHEN** a client validates a build-token list or revocation response
- **THEN** the representation contains its identifier, name, prefix,
capabilities, lifecycle timestamps, and never the plaintext credential or its
stored verifier

### Requirement: Media transport preserves verified metadata and safe binary headers
The shared REST contract SHALL expose bounded media list and metadata responses
without storage keys, and define a multipart upload field named `file` with a
non-empty filename. The transport SHALL treat the verified binary format, not a
caller-supplied `Content-Type` or filename, as authoritative. Binary responses
SHALL use the verified MIME type and a safely encoded display filename; no
filename-derived value may create, split, or override an HTTP response header.

#### Scenario: A claimed MIME type disagrees with bytes
- **WHEN** a multipart upload declares an allowed MIME type but its `file`
  bytes are another, unsafe, or malformed format
- **THEN** the API returns the stable validation envelope and creates neither
  an object nor a metadata record

#### Scenario: A hostile display filename is delivered
- **WHEN** valid media has a filename containing controls or header-like text
- **THEN** its binary response contains only safe media headers and no injected
  response header or unvalidated content type

### Requirement: Publication responses expose independent dispatch outcomes
The shared publish response contract SHALL validate and expose the resulting
content entry, whether the request published or replayed an idempotent prior
publication, and a portable build-dispatch outcome. The outcome SHALL
distinguish accepted (optionally with a build identity), rejected, unavailable,
and not-dispatched dispatches without reporting build completion. A validated
client SHALL be able to present publication success independently from build
dispatch state without importing application or persistence types.

#### Scenario: Publication is accepted while dispatch is unavailable
- **WHEN** publication commits successfully and its build trigger is unavailable
- **THEN** the publish response validates the published entry and an
  `unavailable` dispatch outcome, without representing publication as failed

#### Scenario: An idempotent replay is returned
- **WHEN** a publish request repeats a prior successful idempotent publication
- **THEN** the publish response validates the original entry with `replayed`
  publication state and a `not-dispatched` outcome

### Requirement: Admin entry summaries expose derived state and editor names
The admin entry-list response for `GET /api/v1/admin/models/:modelKey/entries`
SHALL contain `items`, an optional opaque `nextCursor`, and `totals`. Each item
SHALL contain the entry `id`, `modelKey`, draft `title`, `draftRevision`, entry
`updatedAt`, the draft `slug` when present, a derived `status`, `updatedBy`
with the draft's last editor `id` and non-empty `displayName`, and
`listValues`. `status` SHALL be `draft` when the entry has no published
snapshot, `published` when the published snapshot's revision equals the draft
revision, and `changed` when a published snapshot exists and the draft revision
differs. Items with `published` or `changed` status SHALL include
`publishedSnapshotId` and `publishedAt`, the ISO-8601 UTC time of the current
publication; `draft` items SHALL include neither. `listValues` SHALL be a JSON
object that holds only the model's configured `listFields` keys present in the
draft, each with a string, number, or boolean value. `totals` SHALL contain
non-negative integer `all`, `draft`, `published`, and `changed` counts for the
model under the request's search term, independent of its status filter and
cursor. The shared contract SHALL reject an item whose status disagrees with
its publication fields or whose list value is not a JSON scalar.

#### Scenario: A list shows state without a second request
- **WHEN** a model has an unpublished entry, a published unchanged entry, and a
  published entry whose draft was saved again
- **THEN** their summaries report `draft`, `published`, and `changed`, only the
  latter two include `publishedAt`, and `totals` counts one of each with `all`
  equal to three

#### Scenario: A list shows configured field values
- **WHEN** a collection declares `listFields` `["category", "author"]` and a
  draft sets only `category`
- **THEN** that entry's `listValues` contains `category` with its draft value
  and no `author` key or other field

#### Scenario: An inconsistent summary is rejected
- **WHEN** a summary reports `draft` together with `publishedAt`, or `changed`
  without `publishedSnapshotId`
- **THEN** shared contract validation rejects the payload

### Requirement: Admin entry-list queries are validated and query-bound
The admin entry-list route SHALL accept optional `q`, `status`, `sort`,
`limit`, and `after` query parameters. `q` SHALL be trimmed; an empty result
SHALL mean no search, and a term longer than 200 characters SHALL be rejected.
A search SHALL match entries whose draft title or draft slug contains the term,
case-insensitively for ASCII letters. `status` SHALL be one of `draft`,
`published`, or `changed` and SHALL restrict items to that status. `sort` SHALL
be one of `updatedAt`, `-updatedAt`, `title`, `-title`, `publishedAt`, or
`-publishedAt`. A leading `-` means descending, and the default SHALL be
`-updatedAt`. Title ordering SHALL be case-insensitive for ASCII letters.
Publication-time ordering SHALL treat never-published entries as earliest.
Every order SHALL break ties by entry ID in the same direction. An unsupported
status or sort, an over-long term, or an invalid limit SHALL return the stable
`VALIDATION_FAILED` envelope with a JSON Pointer naming the parameter. A
continuation cursor SHALL be accepted only with the same model, search term,
status, and sort that produced it; otherwise the request SHALL fail validation
without returning a page. The generated OpenAPI document SHALL describe these
parameters and the list response schema.

#### Scenario: Search, filter, and sort a collection list
- **WHEN** an editor requests `q=Launch&status=changed&sort=title`
- **THEN** the response contains only changed entries whose draft title or slug
  contains `launch` in any ASCII case, ordered by title ascending, and `totals`
  counts every status among entries that match `launch`

#### Scenario: Reject an unsupported list query
- **WHEN** a client requests `status=archived`, `sort=author`, or a 201-character
  `q`
- **THEN** the API returns `422` `VALIDATION_FAILED` with the pointer `/status`,
  `/sort`, or `/q` and no list content

#### Scenario: Reject a cursor from a different query
- **WHEN** a client reuses a cursor from a `sort=title` page with
  `sort=-updatedAt` or with a different `q`
- **THEN** the API rejects the request with a validation failure instead of
  returning an inconsistent page

### Requirement: Admin entry details name the last editor
Admin entry responses from load, create, complete-draft save, and publication
SHALL include a top-level `updatedBy` containing the draft's last editor `id`
and non-empty `displayName`, so an admin client never needs the users API to
render the editor. `displayName` SHALL be the editor's stored user name. For a
`system:` audit actor, it SHALL be `System`. For an actor without a user record,
it SHALL be `Unknown user`. Public page, collection, path, and build-export
entry DTOs SHALL keep their existing shape and SHALL NOT contain a display name
or the top-level `updatedBy`.

#### Scenario: A viewer loads an entry edited by another user
- **WHEN** a viewer loads an entry whose draft was last saved by an editor
  whose stored user name is `editor@example.test`
- **THEN** the entry response includes `updatedBy` with that editor's ID and
  `displayName` `editor@example.test`

#### Scenario: A synchronized page names the system actor
- **WHEN** an administrator loads a page singleton created by configuration
  synchronization and never saved by a user
- **THEN** its `updatedBy.displayName` is `System`

#### Scenario: Public content keeps personal names out
- **WHEN** a build or public client reads published entries
- **THEN** the payload satisfies the unchanged public entry contract and
  contains no editor display name

### Requirement: Content-model DTOs carry list fields
The admin content-model DTO SHALL include a collection's `listFields` in
declared order when the configuration declares them and SHALL omit the property
otherwise. Shared contract validation SHALL reject `listFields` on a page model
and a `listFields` array that is empty, repeats a name, or names a field
absent from the model's field map.

#### Scenario: The admin reads list columns from configuration
- **WHEN** an authenticated client lists content models for a configuration
  whose `posts` collection declares `listFields` `["category", "author"]`
- **THEN** the `posts` DTO contains that array and a model without list fields
  has no `listFields` property

#### Scenario: A malformed model DTO is rejected
- **WHEN** a model DTO declares `listFields` on a page or names an undeclared
  field
- **THEN** shared contract validation rejects the payload
