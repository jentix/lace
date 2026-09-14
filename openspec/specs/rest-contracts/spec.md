# rest-contracts Specification

## Purpose

Defines the versioned, runtime-validated REST data contracts and transport
conventions shared by Lace API implementations, clients, and documentation.

## Requirements

### Requirement: Shared versioned content DTOs
The system SHALL provide one shared runtime contract for the `/api/v1` content
surface. It SHALL validate request and response representations for content
models; admin entry lists, entry details, complete-draft saves, publications,
and deletions; public page, collection, path, media, and build-export reads;
media metadata; site-build state; cursor pagination; and the error envelope.
The representations SHALL use JSON primitives and objects only, SHALL expose
content values through explicit DTOs rather than persistence rows, and SHALL
remain usable by both Node and Cloudflare API implementations.

#### Scenario: A content response crosses a runtime boundary
- **WHEN** an API implementation returns an entry, public content, media
  metadata, build export, or site-build DTO that satisfies the shared contract
- **THEN** a client can validate the JSON payload without importing a database
  schema or a runtime-specific API package

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
idempotency-key header values used by their associated content operations.

#### Scenario: A timestamp is serialized for JSON
- **WHEN** a portable content value contains a valid UTC timestamp
- **THEN** its response DTO exposes a canonical ISO-8601 UTC string and the
  corresponding request or response schema accepts that string

#### Scenario: An invalid transport primitive is supplied
- **WHEN** a request contains an invalid timestamp, empty cursor, malformed
  ETag, or empty or overlong idempotency key
- **THEN** shared contract validation reports a validation error without
  interpreting the value as an application command

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
message, details? } }`. Validation failures SHALL use
`VALIDATION_FAILED` with field issues whose paths use JSON Pointer notation;
the envelope SHALL not expose stack traces, SQL text, or validator-internal
objects. Each existing domain/application error SHALL map to exactly one stable
status and code pair: `AUTHORIZATION_DENIED` to `403`,
`CONTENT_INVALID_STATE` to `422`, and each of
`CONTENT_MODEL_CARDINALITY_CONFLICT`, `CONTENT_PUBLISHED_IMMUTABLE`,
`CONTENT_REVISION_CONFLICT`, and `CONTENT_ROUTE_CONFLICT` to `409`, preserving
the same code as its machine-readable error code.

#### Scenario: A revision conflict is reported safely
- **WHEN** an optimistic content mutation reaches an existing revision conflict
- **THEN** the API can return status `409` with code
  `CONTENT_REVISION_CONFLICT` and only documented conflict details

#### Scenario: Request validation fails safely
- **WHEN** validation rejects a submitted field or header
- **THEN** the API can return status `422` with code `VALIDATION_FAILED` and
  stable JSON Pointer issue paths without a stack trace, SQL text, or
  implementation-specific validator output
