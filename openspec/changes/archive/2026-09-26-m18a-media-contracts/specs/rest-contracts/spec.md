## ADDED Requirements

### Requirement: Admin media-list queries are validated and query-bound
The admin media-list route SHALL accept optional `q`, `type`, `sort`, `limit`,
and `after` query parameters. `q` SHALL be trimmed; an empty result SHALL mean
no search, and a term longer than 200 characters SHALL be rejected. A search
SHALL match media whose display filename contains the term, case-insensitively
for ASCII letters, as a literal substring. `type` SHALL be one of `image/avif`,
`image/jpeg`, `image/png`, or `image/webp` and SHALL restrict items to that
MIME type. `sort` SHALL be one of `createdAt`, `-createdAt`, `filename`,
`-filename`, `size`, or `-size`. A leading `-` means descending, and the
default SHALL be `-createdAt`. Filename ordering SHALL be case-insensitive for
ASCII letters. Every order SHALL break ties by media ID in the same direction.
An unsupported type or sort, an over-long term, or an invalid limit SHALL return
the stable `VALIDATION_FAILED` envelope with a JSON Pointer naming the
parameter. A continuation cursor SHALL be accepted only with the same search
term, type, and sort that produced it; otherwise the request SHALL fail
validation without returning a page. The generated OpenAPI document SHALL
describe these parameters.

#### Scenario: Search, filter, and sort the library
- **WHEN** an editor requests `q=Cover&type=image/png&sort=-size`
- **THEN** the response contains only PNG items whose filename contains
  `cover` in any ASCII case, ordered from largest to smallest

#### Scenario: The default order is newest first
- **WHEN** a client lists media without `sort`
- **THEN** items are ordered by creation time descending and then media ID
  descending

#### Scenario: Reject an unsupported media-list query
- **WHEN** a client requests `type=image/svg+xml`, `sort=width`, or a
  201-character `q`
- **THEN** the API returns `422` `VALIDATION_FAILED` with the pointer `/type`,
  `/sort`, or `/q` and no list content

#### Scenario: Reject a media cursor from a different query
- **WHEN** a client reuses a cursor from a `sort=filename` page with
  `sort=-createdAt`, a different `type`, or a different `q`
- **THEN** the API rejects the request with a validation failure instead of
  returning an inconsistent page

### Requirement: Admin media details expose usage
The admin API SHALL provide `GET /api/v1/admin/media/:mediaId` for callers with
`content:read`. It SHALL return the media DTO plus `usage`, an array of at most
50 entries. Each usage entry SHALL contain `entryId`, `modelKey`, `title`,
optional `slug`, `status` (`draft`, `published`, or `changed`), and a non-empty
`locations` array. Each location SHALL be either `{ source: "field", field,
states }` or `{ source: "block", blockKey, blockType, field, states }`, where
`states` is a non-empty, duplicate-free subset of `draft` and `published`. An
unknown media ID SHALL return `404` `NOT_FOUND`. The response SHALL contain no
storage key, bucket name, object URL, or credential. Items in `deleting` and
`delete_failed` status SHALL also be readable.

#### Scenario: A used image lists its entries
- **WHEN** a viewer reads an image that a published post uses in its `cover`
  field
- **THEN** the response contains the image metadata, `usageCount` 1, and one
  usage entry with the post's ID, model key, title, slug, status, and a field
  location `cover` in `draft` and `published`

#### Scenario: An unknown media item is not found
- **WHEN** a client reads a media ID that does not exist
- **THEN** the API returns `404` with code `NOT_FOUND`

## MODIFIED Requirements

### Requirement: Errors use stable sanitized envelopes
The system SHALL represent every transport failure as `{ error: { code,
message, details? } }`. Validation failures SHALL use `VALIDATION_FAILED` with
field issues whose paths use JSON Pointer notation; the envelope SHALL not
expose stack traces, SQL text, or validator-internal objects. Each existing
domain/application error SHALL map to exactly one stable status and code pair:
`AUTHORIZATION_DENIED` to `403`, `CONTENT_INVALID_STATE` to `422`, and each of
`CONTENT_MODEL_CARDINALITY_CONFLICT`, `CONTENT_PUBLISHED_IMMUTABLE`,
`CONTENT_REVISION_CONFLICT`, `CONTENT_ROUTE_CONFLICT`, and `MEDIA_IN_USE` to
`409`, preserving the same code as its machine-readable error code. The
transport contract SHALL also represent a missing API resource as `NOT_FOUND`
with `404`, an exhausted request limit as `RATE_LIMITED` with `429`, and an
oversized request body as `PAYLOAD_TOO_LARGE` with `413`.

#### Scenario: A revision conflict is reported safely
- **WHEN** an optimistic content mutation reaches an existing revision conflict
- **THEN** the API can return status `409` with code
  `CONTENT_REVISION_CONFLICT` and only documented conflict details

#### Scenario: Deleting referenced media is reported as in use
- **WHEN** a writer requests deletion or retries deletion of media that content
  still references
- **THEN** the API returns status `409` with code `MEDIA_IN_USE` and a
  sanitized message that names no entry or storage detail

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

### Requirement: Media transport preserves verified metadata and safe binary headers
The shared REST contract SHALL expose bounded media list and metadata responses
without storage keys, and define a multipart upload field named `file` with a
non-empty filename. Every media DTO SHALL name its uploader as `createdBy` with
an `id` and a non-empty `displayName`, and SHALL carry `usageCount`, a
non-negative integer counting the distinct entries that use the item. Media
created by upload SHALL carry positive integer `width` and `height` display
dimensions. The transport SHALL treat the verified binary format, not a
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

#### Scenario: An uploaded item is described without raw user IDs alone
- **WHEN** an editor uploads a valid image
- **THEN** the created media DTO contains `createdBy` with the editor's ID and
  display name, `usageCount` 0, and the image's display width and height
