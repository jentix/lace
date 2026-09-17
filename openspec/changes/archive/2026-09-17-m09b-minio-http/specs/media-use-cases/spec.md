## ADDED Requirements

### Requirement: Authorized binary reads preserve media lifecycle boundaries
The system SHALL resolve a media binary only after the caller has selected an
active metadata record through an authorized admin read or a published-media
read. The binary-read result SHALL retain the verified media MIME type and
bounded byte stream while never exposing the storage key, bucket identity, or
storage credentials. A missing stored object for otherwise eligible metadata
SHALL be an operational failure, not an empty successful media result.

#### Scenario: An eligible media item is read
- **WHEN** an authorized caller requests the binary for active media selected by
  the applicable metadata boundary
- **THEN** the system returns its verified MIME type and object stream without
  revealing its internal object location

#### Scenario: Metadata and object storage disagree
- **WHEN** eligible active media has no corresponding object in storage
- **THEN** the binary read fails as an operational error and does not return an
  empty object as though it were the uploaded media
