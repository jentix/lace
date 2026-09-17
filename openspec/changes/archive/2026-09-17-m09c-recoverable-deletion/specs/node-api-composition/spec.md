## ADDED Requirements

### Requirement: Node composition runs recoverable media-deletion dispatch
The Node composition root SHALL run a bounded background dispatcher for
`media.delete.requested` events after its required startup dependencies have
been validated. It SHALL stop accepting new work and await or safely relinquish
in-flight leases during shutdown, so a later process can recover unfinished
work after lease expiry. Dispatch failures SHALL be logged with only sanitized
event and media identifiers and SHALL not make the HTTP listener appear ready
before required startup validation succeeds.

#### Scenario: A Node process deletes queued media
- **WHEN** a running Node service has an available media-deletion event
- **THEN** its dispatcher claims and processes the event in the background
  without exposing object-store credentials or blocking an HTTP request

#### Scenario: Node restarts during deletion work
- **WHEN** a Node process stops with a media-deletion lease still unfinished
- **THEN** a restarted or peer dispatcher can recover the event after lease
  expiry and the media record remains protected from unsafe synchronous removal
