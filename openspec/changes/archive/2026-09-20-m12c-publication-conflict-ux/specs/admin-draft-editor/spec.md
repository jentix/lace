## ADDED Requirements

### Requirement: The editor makes publication and draft concurrency explicit
The authenticated entry editor SHALL display the current draft revision, its
last editor identity and update time, current published state, and resolved
canonical public path when the model and draft make one available. It SHALL
display the distinct result of the most recent publish attempt, including that
publication succeeded while its build is pending, unavailable, rejected, or
not dispatched; it SHALL not represent that build-dispatch result as confirmed
public-site availability. Only an `admin` role SHALL be offered publication.
Before an admin publishes, the editor SHALL require explicit confirmation and
submit the current draft revision with a non-empty idempotency key. The browser
SHALL retain that key while retrying the same pending/failed network publish
attempt and SHALL replace it only after the attempt reaches a terminal server
response or the user starts a new confirmed publish attempt.

#### Scenario: An admin reviews publication state
- **WHEN** an admin opens a loaded entry with a collection slug and a current
  published snapshot
- **THEN** the editor shows its draft revision and editor/time, published state,
  resolved canonical public path, and a publication/build status that does not
  claim a pending build has succeeded

#### Scenario: An editor cannot publish
- **WHEN** an `editor` opens a loaded entry
- **THEN** the editor does not offer a publish action, while the API remains the
  authorization boundary if a publication request is attempted independently

#### Scenario: A confirmed publish is retried after a network failure
- **WHEN** an admin confirms publication and the browser cannot determine
  whether the request reached the server
- **THEN** a retry sends the same draft revision and idempotency key, and the UI
  uses the server's eventual one-publication result rather than creating a new
  attempt

### Requirement: Revision-conflict recovery preserves local authoring
When a complete-draft save or publish receives `CONTENT_REVISION_CONFLICT`, the
editor SHALL retain all current local form values and dirty state and SHALL
present an accessible conflict recovery state. That state SHALL offer explicit
actions to reload the current server draft or copy a stable JSON representation
of the local complete draft. Reloading SHALL replace local values only after
the user selects that action; copying SHALL not mutate the form. The editor
SHALL NOT automatically merge, reload, resubmit, or overwrite the local draft
after a revision conflict.

#### Scenario: A concurrent save conflicts
- **WHEN** a writer saves a changed draft and the API returns
  `CONTENT_REVISION_CONFLICT`
- **THEN** the writer's current title, slug, fields, and ordered blocks remain
  editable, and the editor offers reload-server-draft and copy-my-JSON actions

#### Scenario: Reload is explicitly chosen
- **WHEN** a writer selects reload-server-draft from a revision-conflict state
- **THEN** the editor fetches and adopts the validated current server draft,
  clears the conflict state, and does not issue another save or publish request

#### Scenario: Copy preserves the conflicted form
- **WHEN** a writer selects copy-my-JSON from a revision-conflict state
- **THEN** the editor copies the local complete-draft representation and leaves
  the same local values and conflict recovery state visible

### Requirement: Later draft edits remain separate from public output
After a successful publication, the editor SHALL adopt the returned entry as
its baseline and continue to treat later complete-draft edits as unpublished
local/draft changes. It SHALL present the current published snapshot separately
from the editable draft and SHALL not claim that a subsequent save changed the
published public output unless a later publication succeeds.

#### Scenario: A later save follows publication
- **WHEN** an admin publishes an entry and then saves a changed draft without
  publishing again
- **THEN** the editor shows the newer draft revision as unpublished changes and
  retains the prior published state/path as the current public output
