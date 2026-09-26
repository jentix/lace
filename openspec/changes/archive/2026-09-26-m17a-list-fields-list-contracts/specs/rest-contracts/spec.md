## ADDED Requirements

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
