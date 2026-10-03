## MODIFIED Requirements

### Requirement: The editor makes publication and draft concurrency explicit
The authenticated entry editor SHALL display, in plain language, the entry's
derived status (draft, published, or published with later changes), the live
revision and when it was published or that the entry is not published, the
current draft revision, the display name of the draft's last editor, and the
draft's update time. It SHALL also display the resolved canonical public path
when the model and draft make one available, and the latest build state known
to the editor. Times SHALL be shown relative to now with the absolute local time
available on demand. Publication details SHALL NOT display raw user or entry
identifiers or ISO timestamps. When no publish attempt was made in the editor,
the build state SHALL say that no build was requested from the editor, with a
link to the Builds screen. After a publish queued a build for a published
version, the editor SHALL follow persisted build history and describe the
build covering that version (target version greater than or equal to it) as
waiting to be recorded, pending, running, succeeded or failed, preferring a
succeeded, then active, then failed covering build, and SHALL stop refreshing
once the state is terminal. A failed state SHALL say the previous release stays
served and link to Builds. When build history cannot be loaded the editor SHALL
keep the dispatch result and the Builds link rather than guess. When the
current configured build site identity is known, the build state SHALL name its
label. The editor SHALL display the distinct result of the most recent publish
attempt, including that publication succeeded while its build is pending,
unavailable, rejected, or not dispatched; it SHALL not represent a dispatch
result or a recorded build outcome as confirmed availability in Astro dev, a
manual static deployment or a provider deployment.
Only an `admin` role SHALL be offered publication. Before an admin publishes,
the editor SHALL require explicit confirmation that names the draft revision
that will become live and can be cancelled. It SHALL then submit the current
draft revision with a non-empty idempotency key. The browser SHALL retain that
key while retrying the same pending/failed network publish attempt and SHALL
replace it only after the attempt reaches a terminal server response or the
user starts a new confirmed publish attempt.

#### Scenario: An admin reviews publication state
- **WHEN** an admin opens a loaded entry with a collection slug and a current
  published snapshot
- **THEN** the editor shows its derived status, the live and draft revisions,
  the last editor's display name with a relative time, the resolved canonical
  public path, and a build state that does not claim a pending build has
  succeeded, without showing a user ID or an ISO timestamp

#### Scenario: No build was requested from the editor
- **WHEN** a user opens an entry and has not published it from this editor
- **THEN** the build state says that no build was requested from the editor and
  links to the Builds screen

#### Scenario: A publication's build is followed
- **WHEN** an admin publishes and history later records a pending, then
  succeeded build whose target version covers the publication
- **THEN** the build state changes from pending to succeeded for that version,
  names the configured site label when known, and stops refreshing

#### Scenario: A covering build fails
- **WHEN** the covering build is recorded as failed
- **THEN** the build state says the previous release stays served and links to
  Builds without claiming the publication is visible on the site

#### Scenario: An editor cannot publish
- **WHEN** an `editor` opens a loaded entry
- **THEN** the editor does not offer a publish action, while the API remains the
  authorization boundary if a publication request is attempted independently

#### Scenario: An admin cancels publication
- **WHEN** an admin opens the publish confirmation and chooses Cancel
- **THEN** the dialog closes and no publication request is sent

#### Scenario: A confirmed publish is retried after a network failure
- **WHEN** an admin confirms publication and the browser cannot determine
  whether the request reached the server
- **THEN** a retry sends the same draft revision and idempotency key, and the UI
  uses the server's eventual one-publication result rather than creating a new
  attempt
