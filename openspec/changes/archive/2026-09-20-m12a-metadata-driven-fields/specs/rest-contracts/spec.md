## MODIFIED Requirements

### Requirement: Shared versioned content DTOs
The system SHALL provide one shared runtime contract for the `/api/v1` content
surface. It SHALL validate request and response representations for content
models, including each model's serializable discriminated field-descriptor map;
admin entry lists, entry details, complete-draft saves, publications, and
deletions; public page, collection, path, media, and build-export reads; media
metadata; site-build state; cursor pagination; and the error envelope. Field
metadata SHALL represent only the supported MVP field types and their portable
options, including defaults and constraints where present, and SHALL reject
unknown descriptor keys or non-JSON values. The representations SHALL use JSON
primitives and objects only, SHALL expose content values through explicit DTOs
rather than persistence rows, and SHALL remain usable by both Node and
Cloudflare API implementations.

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

#### Scenario: A malformed mutation is rejected before dispatch
- **WHEN** a client submits a create, draft-save, publish, or delete payload
  that is missing a required value, contains an unknown key, or supplies a
  value with the wrong JSON type
- **THEN** contract validation rejects it before an application mutation runs
