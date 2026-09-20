## MODIFIED Requirements

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
