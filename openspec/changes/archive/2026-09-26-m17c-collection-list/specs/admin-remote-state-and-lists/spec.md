## MODIFIED Requirements

### Requirement: Model navigation and collection lists reflect configured remote state
The authenticated content landing route SHALL load configured content models.
For every page model it SHALL provide a link to that model's singleton editor
route. For every collection model it SHALL provide a link to a model route that
loads its entries through the API's opaque cursor pagination and presents an
accessible next-page action when another cursor exists, together with how many
of the matching entries are shown. Collection entry lists SHALL provide
distinct loading, empty, no-match, error, and populated states: an empty
collection SHALL explain that no entries exist (with a create action only for
roles that may create), a search or status filter that matches nothing SHALL
say so and offer to clear the filters, and a failed list request SHALL show the
error with a retry action. A failed next-page request SHALL keep the already
loaded entries visible. While a changed search, filter, or sort is loading, the
previously shown entries MAY remain visible but SHALL be marked busy.

#### Scenario: Configured page and collection models are loaded
- **WHEN** an authenticated user opens the content landing route
- **THEN** each page model links directly to its singleton editor route and each
  collection model links to its entry-list route

#### Scenario: A collection has another page of entries
- **WHEN** a collection entry-list response includes a next cursor
- **THEN** the user can request the next page without decoding or modifying the
  cursor, and the list states how many of the matching entries are shown

#### Scenario: A collection contains no entries
- **WHEN** a collection entry-list response without search or status filter
  contains no items
- **THEN** the model route presents an explicit empty state rather than an empty
  table or a loading indicator

#### Scenario: A filter matches nothing
- **WHEN** a collection has entries but the active search or status filter
  matches none of them
- **THEN** the model route states that no entries match and offers a control
  that clears the search and status filter

#### Scenario: The entry list fails to load
- **WHEN** the first entry-list request for a collection fails
- **THEN** the model route shows the error with its technical details and a
  retry action that repeats the request

#### Scenario: The next page fails to load
- **WHEN** a next-page request fails after the first page was shown
- **THEN** the loaded entries stay visible together with the error

### Requirement: Collection-entry mutations expose permission-aware affordances
The admin application SHALL expose collection-entry creation and deletion only
where the resolved role permits the action, while treating that visibility as a
convenience rather than authorization. It SHALL submit create and delete
requests through the authenticated API and, after a successful mutation,
refresh the affected model and entry-list state. The create action SHALL open a
dialog that names the collection, requires a non-blank title before submission,
can be cancelled without creating anything, and starts empty each time it is
opened. The deletion action SHALL be reachable by keyboard from each entry row,
SHALL be named after the entry it deletes, and SHALL require explicit
confirmation in a dialog that names the entry and can be cancelled. A failed
create or delete SHALL keep its dialog open with the error and SHALL not change
the list. After a successful deletion, focus SHALL move to the collection
heading.

#### Scenario: A viewer opens a collection list
- **WHEN** a `viewer` opens a collection model route
- **THEN** it can inspect, search, filter, and sort the entry list but is not
  offered create or delete controls

#### Scenario: An editor creates an entry
- **WHEN** an `editor` completes the create-entry action for a collection
- **THEN** the application creates the entry through the API and refreshes the
  collection list before presenting the result

#### Scenario: A blank title cannot be submitted
- **WHEN** an editor opens the create-entry dialog and the title is empty or
  whitespace
- **THEN** the create action is unavailable and no request is sent

#### Scenario: A permitted user deletes an entry
- **WHEN** a permitted user activates the delete control for "First post" and
  confirms the deletion
- **THEN** the application sends the delete request, refreshes affected
  collection state only after the API confirms success, and moves focus to the
  collection heading

#### Scenario: A user cancels deletion
- **WHEN** a permitted user opens the delete confirmation and cancels it
- **THEN** no delete request is sent and the entry remains listed

#### Scenario: Deletion fails
- **WHEN** the API rejects a confirmed deletion
- **THEN** the dialog stays open with the error and the entry remains listed

## ADDED Requirements

### Requirement: Collection lists present entry state without internal identifiers
Each collection entry row SHALL show the entry title as a link to its editor,
the entry slug (or a neutral note when it has none), the derived status (draft,
published, or changed), a value for each of the model's configured list fields
in configuration order, the publication date for published or changed entries,
and the relative last-edit time with the last editor's display name, with the
absolute time available to assistive technology and on hover. List-field
column headers SHALL use the field label, falling back to its key. List-field
values SHALL be formatted by field type: booleans as yes or no, numbers with
locale grouping, dates and datetimes as readable dates, select values by their
option, and missing values as a neutral dash. No list surface SHALL show an
entry ID or a user ID. Viewers, editors, and administrators SHALL see the same
row data.

#### Scenario: A changed entry with list fields
- **WHEN** the `posts` model declares list fields `category` (select, label
  "Category") and `featured` (boolean) and an entry titled "Launch" with slug
  `launch` has status `changed`, `category` "news", `featured` true, was
  published on 2026-09-20 and last edited two hours ago by "Ada Editor"
- **THEN** its row shows "Launch" linking to the entry editor, `launch`, a
  Changed status, "news" under "Category", "Yes" under "featured", the
  publication date, "2 hours ago", and "Ada Editor"

#### Scenario: A draft entry without optional values
- **WHEN** a draft entry has no slug, no value for a list field, and no
  publication
- **THEN** its row shows a neutral no-slug note and a dash for the missing list
  value and for the publication date

#### Scenario: Identifiers stay hidden
- **WHEN** any role views a collection list
- **THEN** no cell, header, or control label contains the entry ID or the
  editor's user ID

### Requirement: Collection list search, status filter, and sort are URL state
The collection route SHALL keep its title/slug search term, status filter, and
sort order in the route's URL search parameters and SHALL request entries from
the API with exactly those values. Opening or reloading a collection URL with
these parameters SHALL restore the same search box contents, status filter,
sort order, and results. Unsupported status or sort values, and search terms
that are blank or longer than the API accepts, SHALL be ignored rather than
causing an error, and the API's default sort SHALL not be written to the URL.
Search input SHALL update the URL after the user pauses typing without adding a
history entry per keystroke. The status filter SHALL show the per-status totals
the API reports for the current search. Title, publication date, and last-edit
columns SHALL be sortable from their headers, which SHALL expose the current
sort direction to assistive technology. Changing the search, status, or sort
SHALL restart pagination at the first page; pagination cursors SHALL never be
written to the URL.

#### Scenario: A filtered list survives a reload
- **WHEN** an editor searches for "launch", selects the Changed filter, sorts
  by title, and reloads the page
- **THEN** the URL carries `q=launch`, `status=changed`, and `sort=title`, and
  after the reload the search box, filter, and title sort are restored and the
  API is queried with the same values

#### Scenario: Unsupported parameters are ignored
- **WHEN** a user opens `/content/posts?status=archived&sort=author`
- **THEN** the list loads unfiltered with the default sort and no error

#### Scenario: Status totals follow the search
- **WHEN** the API reports totals of 4 entries (1 draft, 2 published, 1
  changed) for the search "launch"
- **THEN** the status filter shows All 4, Draft 1, Published 2, and Changed 1

#### Scenario: Sorting from a column header
- **WHEN** a user activates the Title column header on a list sorted by the
  default order
- **THEN** the list is requested sorted by title ascending, the Title header
  reports ascending order, and activating it again requests descending order

#### Scenario: Changing a filter restarts pagination
- **WHEN** a user has loaded a second page and then changes the status filter
- **THEN** the list is requested without a cursor and shows the first page of
  the new filter
