# media-use-cases Specification

## Purpose

Defines portable, security-conscious media upload validation and metadata
lifecycle behavior while keeping binary objects outside the content database.

## Requirements

### Requirement: Image upload accepts only verified bounded raster formats
The system SHALL accept uploads no larger than 10 MiB only when their binary
content is exactly one well-formed JPEG, PNG, WebP, or AVIF image. It SHALL
derive the MIME type from the validated binary format rather than a filename or
caller-supplied header; reject SVG, empty or truncated inputs, malformed image
containers, polyglot/trailing executable content, and every other MIME type.
It SHALL sanitize a display filename to a non-empty safe text value and generate
an opaque, unique storage key that does not disclose that filename. The system
SHALL reject an image wider or taller than 12,000 pixels or containing more
than 100,000,000 total pixels.

#### Scenario: A valid verified image is accepted
- **WHEN** an authenticated writer uploads a complete 10 MiB-or-smaller JPEG,
  PNG, WebP, or AVIF whose decoded dimensions are within the configured limits
- **THEN** the upload is accepted with the binary-derived MIME type, sanitized
  display filename, opaque storage key, and recorded image dimensions

#### Scenario: Filename or MIME spoofing cannot bypass validation
- **WHEN** an upload claims an allowed MIME type or extension but its bytes are
  SVG, another format, malformed, empty, truncated, or polyglot content
- **THEN** the upload is rejected before object storage or metadata persistence

#### Scenario: An oversized image is rejected
- **WHEN** an otherwise valid image exceeds the byte limit, either per-side
  dimension limit, or total pixel limit
- **THEN** the upload is rejected without storing an object or metadata row

### Requirement: Object and metadata creation preserve a recoverable boundary
The system SHALL write a verified binary object before creating its media
metadata. A successful metadata record SHALL contain only its identity, opaque
storage key, sanitized display filename, binary-derived MIME type, byte size,
optional image dimensions, active status, actor, and timestamps; it SHALL NOT
contain binary bytes. If metadata creation fails after an object write, the
system SHALL make a best-effort attempt to delete that object, return a failure,
and record an operational error that identifies the opaque storage key without
including the binary payload or caller secrets.

#### Scenario: Object write precedes active metadata
- **WHEN** a verified upload completes successfully
- **THEN** the object exists before its active metadata becomes observable and
  the stored metadata contains no binary payload

#### Scenario: Metadata persistence fails after an object write
- **WHEN** storage accepts a verified object but metadata creation fails
- **THEN** no active media record is returned, the system attempts cleanup of
  the opaque storage key, and an operational error is recorded for diagnosis

### Requirement: Authorized media lifecycle operations are storage-neutral
The system SHALL provide transport-neutral create, list, get, delete-request,
and retry-delete media use cases. Create, delete-request, and retry-delete
SHALL require `media:write`; list and get SHALL require `content:read`.
Delete-request and retry-delete SHALL operate on metadata lifecycle state and
MUST NOT synchronously delete the binary object; asynchronous deletion dispatch
remains responsible for removal. Results SHALL be detached portable metadata
and SHALL never expose an internal storage key to transport consumers.

#### Scenario: A viewer can inspect but cannot mutate media
- **WHEN** a viewer lists or gets media and then requests an upload or deletion
- **THEN** the read returns portable metadata while each mutation fails with the
  stable authorization error before storage or persistence changes

#### Scenario: A deletion request is recoverable
- **WHEN** a writer requests deletion of an unreferenced active item or retries
  an item whose prior deletion has failed
- **THEN** the use case records the requested deletion lifecycle transition and
  returns its updated metadata without deleting the binary synchronously
