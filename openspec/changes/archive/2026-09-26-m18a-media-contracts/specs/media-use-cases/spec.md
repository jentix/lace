## ADDED Requirements

### Requirement: Media usage is derived from the content reference projection
The system SHALL derive a media item's usage only from the relational
media-reference projection that the deletion guard also checks. An entry SHALL
count as using an item when its current draft snapshot or its current published
snapshot references the item in an entry field or in a block field. Every media
read result SHALL carry `usageCount`, the number of distinct entries using the
item. A single-item read SHALL also return up to 50 using entries, ordered by
entry update time descending and then entry ID descending. Each entry SHALL
report its ID, model key, draft title, draft slug when present, and derived
entry status (`draft`, `published`, or `changed`). Each entry SHALL list every
location that references the item: an entry field, or a block's field together
with the block's key and type. Each location SHALL say whether the draft, the
published snapshot, or both reference it. `usageCount` SHALL remain the full
count when the returned list is truncated. A media item SHALL be refused
deletion exactly when its `usageCount` is greater than zero.

#### Scenario: Draft and published usage are distinguished
- **WHEN** an entry's published snapshot uses an image in a hero block and its
  newer draft has replaced that image with another
- **THEN** the first image reports that entry with the block location marked
  published only, and the second image reports it marked draft only

#### Scenario: One entry with several references counts once
- **WHEN** one entry references the same image in an entry field and in two
  block fields
- **THEN** the image's `usageCount` is 1 and its usage lists that entry once
  with three locations

#### Scenario: Usage guidance agrees with the deletion guard
- **WHEN** a writer requests deletion of an item whose `usageCount` is 1
- **THEN** the request is refused as in use, and after the entry stops
  referencing the item in both its draft and published snapshots, `usageCount`
  is 0 and the deletion request is accepted

#### Scenario: A heavily used item is truncated
- **WHEN** 60 entries use one image
- **THEN** its single-item read returns 50 entries and `usageCount` 60

## MODIFIED Requirements

### Requirement: Image upload accepts only verified bounded raster formats
The system SHALL accept uploads no larger than 10 MiB only when their binary
content is exactly one well-formed JPEG, PNG, WebP, or AVIF image. It SHALL
derive the MIME type from the validated binary format rather than a filename or
caller-supplied header; reject SVG, empty or truncated inputs, malformed image
containers, polyglot/trailing executable content, and every other MIME type.
It SHALL sanitize a display filename to a non-empty safe text value and generate
an opaque, unique storage key that does not disclose that filename. The system
SHALL reject an image wider or taller than 12,000 pixels or containing more
than 100,000,000 total pixels. Every accepted upload SHALL record a positive
integer width and height, measured after the image's embedded orientation is
applied, so the recorded dimensions are the dimensions at which the image is
displayed.

#### Scenario: A valid verified image is accepted
- **WHEN** an authenticated writer uploads a complete 10 MiB-or-smaller JPEG,
  PNG, WebP, or AVIF whose decoded dimensions are within the configured limits
- **THEN** the upload is accepted with the binary-derived MIME type, sanitized
  display filename, opaque storage key, and recorded image dimensions

#### Scenario: A rotated photo records display dimensions
- **WHEN** a writer uploads a JPEG whose stored pixels are 400 wide and 200
  high and whose EXIF orientation rotates it by 90 degrees
- **THEN** the created media records width 200 and height 400

#### Scenario: Filename or MIME spoofing cannot bypass validation
- **WHEN** an upload claims an allowed MIME type or extension but its bytes are
  SVG, another format, malformed, empty, truncated, or polyglot content
- **THEN** the upload is rejected before object storage or metadata persistence

#### Scenario: An oversized image is rejected
- **WHEN** an otherwise valid image exceeds the byte limit, either per-side
  dimension limit, or total pixel limit
- **THEN** the upload is rejected without storing an object or metadata row

### Requirement: Authorized media lifecycle operations are storage-neutral
The system SHALL provide transport-neutral create, list, get, delete-request,
and retry-delete media use cases. Create, delete-request, and retry-delete
SHALL require `media:write`; list and get SHALL require `content:read`.
List SHALL accept an optional filename search term, an optional MIME-type
filter, and a sort. The search term SHALL be trimmed, an empty term SHALL mean
no search, and a term longer than 200 characters SHALL be rejected before any
read. A search SHALL match filenames containing the term, case-insensitively
for ASCII letters. The type filter SHALL be one of the allowed image MIME
types. The sort SHALL be `createdAt`, `filename`, or `size`, ascending or
descending, defaulting to newest first. Each list, get, create, and deletion
result SHALL name its uploader with an ID and a display name, using `System`
for `system:` actors and `Unknown user` for an ID without a user record, and
SHALL carry the item's `usageCount`. Get SHALL also return the item's usage.
Delete-request and retry-delete SHALL operate on metadata lifecycle state and
MUST NOT synchronously delete the binary object; asynchronous deletion dispatch
remains responsible for removal. A delete-request or retry-delete for an item
that content still references SHALL fail with the stable `MEDIA_IN_USE` error;
any other ineligible item SHALL fail with `CONTENT_INVALID_STATE`. Results SHALL
be detached portable metadata and SHALL never expose an internal storage key to
transport consumers.

#### Scenario: A viewer can inspect but cannot mutate media
- **WHEN** a viewer lists or gets media and then requests an upload or deletion
- **THEN** the read returns portable metadata while each mutation fails with the
  stable authorization error before storage or persistence changes

#### Scenario: A deletion request is recoverable
- **WHEN** a writer requests deletion of an unreferenced active item or retries
  an item whose prior deletion has failed
- **THEN** the use case records the requested deletion lifecycle transition and
  returns its updated metadata without deleting the binary synchronously

#### Scenario: A referenced item is refused as in use
- **WHEN** a writer requests deletion or retries deletion of an item that an
  entry's draft or published snapshot references
- **THEN** the request fails with `MEDIA_IN_USE`, the item keeps its status,
  and no deletion work is queued

#### Scenario: An invalid list query is rejected before reading
- **WHEN** a caller lists media with a 201-character search term, an
  unsupported type, or an unsupported sort
- **THEN** the use case rejects the request and performs no media read

#### Scenario: The uploader is named without the users API
- **WHEN** a viewer lists media uploaded by an editor whose user record has the
  name `Ada`
- **THEN** each item names its uploader with that editor's ID and display name
  `Ada`
