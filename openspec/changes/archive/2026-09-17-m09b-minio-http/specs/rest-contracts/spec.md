## ADDED Requirements

### Requirement: Media transport preserves verified metadata and safe binary headers
The shared REST contract SHALL expose bounded media list and metadata responses
without storage keys, and define a multipart upload field named `file` with a
non-empty filename. The transport SHALL treat the verified binary format, not a
caller-supplied `Content-Type` or filename, as authoritative. Binary responses
SHALL use the verified MIME type and a safely encoded display filename; no
filename-derived value may create, split, or override an HTTP response header.

#### Scenario: A claimed MIME type disagrees with bytes
- **WHEN** a multipart upload declares an allowed MIME type but its `file`
  bytes are another, unsafe, or malformed format
- **THEN** the API returns the stable validation envelope and creates neither
  an object nor a metadata record

#### Scenario: A hostile display filename is delivered
- **WHEN** valid media has a filename containing controls or header-like text
- **THEN** its binary response contains only safe media headers and no injected
  response header or unvalidated content type
