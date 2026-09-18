## Why

Step 9 needs a portable media application layer before MinIO, HTTP transport, and
recoverable deletion can be added. Existing content commands can validate active
media references, but they cannot safely accept uploads, persist metadata after
storage succeeds, or provide the media lifecycle use cases.

## What Changes

- Implement roadmap Step 9, Session 9A: storage-neutral media upload validation
  and create, list, get, delete-request, and retry use cases.
- Define portable media persistence, object-storage, image-metadata, and
  operational-error boundaries; persist metadata only after a successful object
  write and make failed metadata writes attempt object cleanup.
- Validate exact allowed image MIME types from binary signatures, reject unsafe
  or malformed files, sanitize display filenames, create opaque object keys, and
  enforce byte, dimension, and pixel limits.
- Extend complete-draft validation to validate all media identities and rebuild
  its supplied relational reference projection from the accepted aggregate.
- Add focused unit and contract tests using portable doubles. Node MinIO/S3
  wiring, HTTP routes, Docker Compose, and deletion dispatch remain separate
  9B/9C work.

## Capabilities

### New Capabilities
- `media-use-cases`: Portable, security-conscious media validation and lifecycle
  behavior for upload and metadata management.

### Modified Capabilities
- `application-ports-and-commands`: Add the focused portable media lifecycle
  command/read contracts and their storage/metadata dependencies.
- `content-use-cases`: Require full draft validation to rebuild its media
  reference projection from every accepted media field.

## Impact

- Affected packages: `@lacecms/application`, `@lacecms/domain`, and test
  doubles; Node storage and API composition are intentionally not implemented in
  this session.
- No binary bytes enter SQLite/D1; only validated metadata and opaque storage
  keys are persisted.
- Depends on the existing media schema/reference projection from Step 5 and the
  portable object-storage boundary from Step 4. This proposal follows
  architecture §§4.5–4.7 and roadmap Step 9A.
