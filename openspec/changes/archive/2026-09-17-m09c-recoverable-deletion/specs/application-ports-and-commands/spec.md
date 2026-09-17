## ADDED Requirements

### Requirement: Portable dispatch and media-finalization commands preserve recovery state
The system SHALL expose portable contracts to claim and conditionally complete
leased asynchronous events with a retry policy, as well as to finalize one
claimed media-deletion event. Media finalization SHALL either remove only a
still-`deleting`, unreferenced media record after its object deletion succeeds,
or record a sanitized terminal deletion failure on that media record. These
contracts SHALL carry no binary data, HTTP values, database rows, credentials,
or raw infrastructure errors.

#### Scenario: A runtime finalizes an object-deletion event
- **WHEN** an adapter receives a valid active lease for one
  `media.delete.requested` event after idempotent object deletion
- **THEN** it can complete the event and remove only the matching eligible media
  metadata through portable command inputs and outputs

#### Scenario: A stale completion is refused
- **WHEN** a dispatcher attempts to finalize or fail an event with an expired,
  replaced, or otherwise invalid lease
- **THEN** the adapter preserves the later event and media state without
  reporting a successful completion
