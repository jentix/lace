## ADDED Requirements

### Requirement: Node entry summaries derive state, totals, and editor names
The Node persistence adapter SHALL derive each admin entry summary's status by
comparing the current published snapshot's revision with the draft revision,
SHALL report the published snapshot's creation time as `publishedAt`, and SHALL
read `listValues` only from the requested list fields in the draft's stored
field values. It SHALL omit absent keys and non-scalar values. It SHALL resolve
the draft's last editor display name from the stored user name in the same
read, falling back to `System` for `system:` actors and `Unknown user` for
missing users. It SHALL compute per-status totals for the model and search term
in one aggregate read, independent of the status filter and cursor. The search
SHALL bind the term as a query parameter and match it as a literal substring,
not as a pattern.

#### Scenario: Totals and status agree after publication and edit
- **WHEN** an entry is published and its draft is then saved again
- **THEN** its summary reports `changed` with the publication time, and the
  totals move it from `published` to `changed` without changing `all`

#### Scenario: Search terms are literal
- **WHEN** a search term contains `%`, `_`, or a quote character
- **THEN** only entries whose draft title or slug contains those characters
  literally match, and the term never changes the SQL statement

#### Scenario: A missing editor still has a name
- **WHEN** a draft's `updated_by` names an actor with no user record
- **THEN** the summary's `updatedBy.displayName` is `Unknown user` and the
  list read succeeds

## MODIFIED Requirements

### Requirement: Node content reads use validated, stable cursor boundaries
The Node persistence adapter SHALL return portable entry aggregates and bounded
cursor pages without database-row types. It SHALL encode continuation cursors as
base64url-encoded versioned JSON, validate the version and every value before
using a cursor as a query boundary, and reject malformed, unsupported, or
wrong-kind cursors without running an unbounded query. An admin model-entry
cursor's kind SHALL bind the model key, search term, status filter, and sort. It
SHALL be rejected for any other combination. It SHALL be ordered by the
requested sort key and then by entry ID in the same direction: `updated_at`,
case-insensitive draft title, or published snapshot `created_at` with
never-published entries treated as earliest. The default SHALL remain
`(updated_at DESC, id DESC)` and SHALL use the model-entry list index. A public
collection page SHALL be ordered by
`(published snapshot created_at DESC, entry id DESC)`. Neither cursor is an
authorization claim, and neither SHALL require a signature.

#### Scenario: Admin continuation retains its order
- **WHEN** an administrator reads a full page of model entries and passes its
  continuation cursor to the next bounded request
- **THEN** the next page contains only rows after the prior
  `(updated_at DESC, id DESC)` boundary with no duplicate row from that page

#### Scenario: Every admin sort pages without gaps or duplicates
- **WHEN** a caller pages a model's entries one row at a time by title, update
  time, or publication time in either direction, including equal titles and
  never-published entries
- **THEN** the concatenated pages contain every matching entry exactly once in
  the requested order

#### Scenario: Invalid cursor is rejected before a query
- **WHEN** a caller supplies malformed base64url data, unsupported cursor
  version, missing field, unsafe timestamp, a sort value of the wrong type, or
  a cursor for a different list, model, search term, status, or sort
- **THEN** the adapter rejects the request and does not treat its values as SQL
  query parameters

#### Scenario: Public collections have independent stable paging
- **WHEN** a caller pages published collection content that shares publication
  timestamps
- **THEN** the continuation boundary uses the published snapshot timestamp and
  entry ID so the result order is deterministic
