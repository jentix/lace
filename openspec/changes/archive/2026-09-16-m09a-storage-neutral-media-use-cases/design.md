## Context

The existing domain already models metadata-only media records and the content
application service validates active media field values. The application package
has a generic byte-stream object-storage boundary, while the SQLite schema and
repository already own media metadata and reference-projection tables. There is
no upload validator, metadata-create port, image metadata boundary, or media
lifecycle service yet. See `proposal.md` for motivation and the delta specs for
behavioral requirements.

## Goals / Non-Goals

**Goals:**

- Establish a runtime-neutral media policy for verified JPEG, PNG, WebP, and
  AVIF files, including the approved 10 MiB, 12,000-pixel-per-side, and
  100-megapixel limits.
- Preserve the accepted permission matrix: media mutations require `media:write`
  while metadata reads require `content:read`.
- Keep binary validation and image inspection in portable application-facing
  boundaries so Node/MinIO and Workers/R2 can meet the same contract.
- Persist an active media row only after a successful object write and make
  metadata-write failure observable and recoverable by best-effort cleanup.
- Make complete-draft reference extraction exhaustive and deterministic.

**Non-Goals:**

- S3/MinIO clients, R2 clients, HTTP upload/download routes, multipart parsing,
  compose configuration, public URLs, or signed URLs (9B).
- Outbox leasing, deleting an object, terminal deletion failure handling, or
  asynchronous retry dispatch (9C).
- Resizing, transcoding, EXIF preservation, animated-image support, SVG, GIF,
  or non-image media.

## Decisions

### Keep validation policy in `@lacecms/application`

The application package will expose constants and validation results for the
fixed raster allowlist and limits. It will consume a portable image-metadata
inspector rather than import a Node-only parser. This protects the established
domain → application → runtime dependency direction and permits separate Node
and Worker adapters.

Alternatives considered:

- Validate only in HTTP routes. Rejected because direct callers and a second
  runtime could bypass policy.
- Choose a Node image library in this session. Rejected because the policy must
  work before choosing equivalent Worker support; an adapter makes the parity
  boundary explicit.

### Buffer a bounded upload during 9A

The media use case will consume a portable byte stream into an in-memory bounded
byte sequence before validation, inspection, and object write. The hard 10 MiB
limit bounds memory and lets a common validator reject magic-byte, truncation,
and trailing-data attacks before an object is written. Session 9B will add
streaming multipart ingestion and its own cutoff test at the transport/storage
edge without changing this application contract.

Alternatives considered:

- Put unverified chunks directly into object storage. Rejected because invalid
  objects become externally stored before signature/structure validation.
- Require all callers to pass `Uint8Array`. Rejected because the existing
  cross-runtime storage port already represents binary input as `ByteStream`.

### Separate object success from metadata persistence

The upload orchestration will: authenticate, fully validate the upload, allocate
a media ID and opaque key, put the object, then ask a specialized metadata
command to create the active row. If that command fails, it will attempt one
best-effort delete and send a sanitized operational log record containing only
the key and failure classification. Cleanup failure does not conceal the
metadata failure.

Alternatives considered:

- Insert a pending metadata row before storage. Rejected because the approved
  9A behavior says metadata insertion follows successful storage.
- Silently ignore cleanup failure. Rejected because orphaned objects need
  operator-visible evidence without logging user content or secrets.

### Derive, validate, and replace media reference projections in application

`ContentUseCases` will walk normalized model fields and normalized block fields
using the existing descriptor/registry metadata. It will validate every present
media ID as active and pass a newly derived complete projection to the existing
atomic create/save commands. Persistence adapters continue to replace the
projection atomically; they never parse user JSON to infer it.

Alternatives considered:

- Diff the prior projection in the service. Rejected because replacement is
  simpler, avoids stale rows, and preserves the current atomic command boundary.
- Extract references in SQLite JSON queries. Rejected because it differs across
  D1/SQLite and duplicates configuration-aware validation.

## Risks / Trade-offs

- [A 10 MiB buffered upload raises per-request memory use] → The limit is hard,
  validation happens before storage, and 9B will bound transport ingestion.
- [Image decoders may disagree across runtimes] → The metadata port returns a
  normalized verified format/dimensions result and shared contract fixtures will
  test both adapters later.
- [Best-effort cleanup can leave an orphan object] → The operation logs the
  opaque key; no active metadata row is exposed, and later operational recovery
  can target the key.
- [Existing media table writes are Node-specific today] → 9A adds portable
  command shapes and doubles; the Node adapter implementation is deliberately
  scoped to its own follow-on integration work only where required.

## Migration Plan

1. Add the portable metadata and inspection contracts plus deterministic doubles.
2. Implement validation and media lifecycle orchestration with unit/contract
   tests.
3. Extend the existing complete-draft service and atomic persistence commands to
   replace media-reference projections from the validated aggregate.
4. Run focused tests and workspace quality checks. No schema migration is
   required because the media and reference-projection tables already exist.

Rollback is code-only: deploy the preceding application package version. Objects
written before a metadata failure remain discoverable through the sanitized
operational record and are not publicly addressable by a media row.
