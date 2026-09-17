## ADDED Requirements

### Requirement: Node persistence atomically protects media deletion races
The Node SQLite adapter SHALL atomically claim and complete media-deletion
outbox work, and SHALL retain expired leases for recovery. It SHALL transition
active or failed media to `deleting` and enqueue deletion work only while no
reference exists in the same transaction. A complete-draft write SHALL reject
any referenced media that is not active before replacing its projection. Media
finalization SHALL delete metadata only while it remains `deleting` and has no
reference; a conflicting save or deletion transition SHALL leave a recoverable
event and valid relational state rather than deleting referenced metadata.

#### Scenario: Draft save cannot select deleting media
- **WHEN** a complete-draft save identifies a media record already marked
  `deleting`
- **THEN** the save fails before changing its draft, block, or reference rows

#### Scenario: Reference and deletion marking compete
- **WHEN** one SQLite transaction commits a new valid media reference while
  another attempts to mark or retry that media for deletion
- **THEN** only the reference or the deletion transition commits, and no
  deletion event succeeds for media with the committed reference

#### Scenario: Finalization sees a competing reference
- **WHEN** media deletion finalization encounters a newly committed reference
- **THEN** it retains the media metadata and a durable recoverable or terminal
  deletion outcome without violating the media-reference foreign key
