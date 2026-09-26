## ADDED Requirements

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
