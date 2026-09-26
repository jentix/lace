## ADDED Requirements

### Requirement: Content landing summarizes pages and collections
The content landing route SHALL present configured pages and collections as
separate groups. Each page SHALL show its label, public path, the singleton's
derived status (draft, published, or changed), its relative last-edit time,
and the last editor's display name, and SHALL open the singleton editor. Each
collection SHALL show its label, route pattern, total entry count, and the
counts of published, changed, and draft entries from the API's per-status
totals, and SHALL open the collection's entry list. The overview SHALL never
show an entry ID or user ID. A failed summary request for one model SHALL show
that model's error in place without hiding the other models, and the existing
no-models, missing-singleton, and API-error states SHALL be preserved.

#### Scenario: A published page with later edits
- **WHEN** the `home` page singleton has status `changed`, was updated two
  hours ago by "Ada Editor"
- **THEN** the Home page card shows a Changed status, "2 hours ago", and "Ada
  Editor", and links to the singleton editor

#### Scenario: A collection with mixed statuses
- **WHEN** the `posts` totals report 5 entries with 3 published, 1 changed, and
  1 draft
- **THEN** the Posts card shows 5 entries with 3 published, 1 changed, and
  1 draft, and links to `/content/posts`

#### Scenario: One model summary fails
- **WHEN** the entry-list request for `posts` fails while `home` succeeds
- **THEN** the Posts card shows the error and the Home card still renders

#### Scenario: A viewer opens the overview
- **WHEN** a `viewer` session opens the content landing route
- **THEN** it sees the same summaries as an editor and no create or delete
  actions
