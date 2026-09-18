## ADDED Requirements

### Requirement: Media object deletion is asynchronously recoverable
The system SHALL process a requested media deletion only through durable
asynchronous dispatch. It SHALL idempotently delete the private object before
removing the corresponding `deleting` metadata record, and SHALL never remove
metadata before that object deletion succeeds or is confirmed absent. After the
configured final failed attempt, it SHALL retain the media as `delete_failed`
with a sanitized diagnosable failure; an authorized retry SHALL return it to
the requested-deletion lifecycle only if it remains unreferenced.

#### Scenario: Object deletion completes successfully
- **WHEN** a dispatcher processes an eligible deleting media item and object
  storage reports deletion success or absence
- **THEN** the private object is no longer reachable and its deleting metadata
  record and completed deletion event are removed atomically from future work

#### Scenario: Storage remains unavailable
- **WHEN** an eligible deleting media item reaches the configured final failed
  dispatch attempt because object storage remains unavailable
- **THEN** its metadata remains available to an authorized administrator as
  `delete_failed`, contains no raw storage error, and can be retried without
  synchronously deleting its object

#### Scenario: A newly committed reference blocks finalization
- **WHEN** a media-deletion event is claimed and a valid content save commits a
  new reference before deletion metadata is finalized
- **THEN** the finalization does not remove the referenced metadata and the
  event remains recoverable or visible as a safe failure
