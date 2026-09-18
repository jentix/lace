## Context

See `proposal.md` for motivation. Step 9A established the verified-image policy
and metadata lifecycle, but Node still injects `NodePlaceholderObjectStorage`,
has no image-inspection adapter, and Hono has only JSON/content routes. The
SQLite repository already implements private media lookup and the join that
finds media referenced by a current published snapshot.

## Goals / Non-Goals

**Goals:**

- Keep SDK and Node stream conversion code in `@lacecms/platform-node`.
- Add media binary reads to the application service so Hono sees neither keys
  nor repository objects.
- Parse multipart bodies incrementally on just the upload route while retaining
  the lower JSON limit elsewhere.
- Verify MinIO/bucket availability before listener binding, then keep normal
  readiness cheap and local.

**Non-Goals:**

- Cloudflare/R2, public buckets, signed URLs, cache policy, range support,
  resizing, or non-image uploads.
- Directly streaming unverified uploads into MinIO: 9A deliberately validates
  the complete bounded byte sequence before calling object storage.
- Outbox-driven object deletion and retries, which belong to Session 9C.

## Decisions

### Use explicit private S3 configuration and startup preflight

`NodeRuntimeSettings` will gain required MinIO endpoint, bucket, region,
access-key, secret, and positive timeout inputs. URL validation rejects
credentials, unsupported schemes, query/fragment, and malformed values; errors
name only configuration keys. A `NodeMinioObjectStorage` owns the AWS S3 client
and translates portable `ByteStream` values to/from Node readable streams. Each
HeadBucket, PutObject, GetObject, and DeleteObject command receives a bounded
abort signal. `startNodeServer` awaits storage preflight before `listen`, so
bucket errors never leave an apparently healthy service accepting uploads. The
preflight verifies an existing bucket; Compose creates the development bucket.

Alternatives considered:

- A failing placeholder until the first request: rejected because upload errors
  arrive too late and readiness is misleading.
- Production bucket creation at startup: rejected because a typo must fail
  closed and bucket lifecycle is infrastructure-owned.
- Public MinIO URLs: rejected because they leak topology and weaken the stable
  Lace public-media URL.

### Keep binary selection and authorization in the media application boundary

`MediaUseCases` will add admin-preview and public-binary operations. Preview
checks `content:read`, loads active metadata, then reads its private key. Public
binary uses the repository's current-published-media join first, verifies active
status, then reads storage. Both return a portable binary result containing only
verified MIME type, sanitized display filename, and `ByteStream`; neither
returns a key. A missing object after eligible metadata is an operational error.
Hono converts this result directly to a streaming response.

Alternatives considered:

- Have Hono combine repository and storage calls: rejected because it exposes
  persistence values to transport and duplicates authorization rules.
- Redirect to signed URLs: rejected because streaming preserves a durable Lace
  URL without browser access to the private bucket.

### Isolate multipart parsing from JSON body limits and cap it before storage

The server will use a WHATWG-stream-compatible multipart parser on the upload
route only. It requires exactly one file part named `file`, rejects any other
part, feeds a byte-counting iterable to the media service, and cancels parsing
when the file crosses 10 MiB. The generic body-limit middleware remains on JSON
routes but cannot consume this upload. Since `MediaUseCases.create` buffers and
validates the bounded input before `put`, neither an oversize stream nor MIME
mismatch creates an object.

Alternatives considered:

- `request.formData()`: rejected because it buffers before a route-owned cutoff.
- Raising the global body limit: rejected because it weakens protection for
  unrelated JSON routes.

### Generate binary headers only from verified metadata

Hono sets `Content-Type` from verified media metadata and one inline
`Content-Disposition` using an RFC 5987 UTF-8 filename parameter from the
sanitized filename. It never reflects multipart headers or request filenames.
Ineligible public IDs return JSON 404 before storage access. Storage failures
after eligibility map to the existing sanitized internal error. Delete returns
`202 Accepted` with the deleting metadata DTO because it starts 9C work only.

### Compose MinIO with explicit local secrets

`docker-compose.dev.yml` will define the persistent `minio-data` volume, MinIO,
and a one-shot bucket initializer after a MinIO health check. Root/application
credentials and bucket name come from required environment variables; an
ignored local `.env` can contain values, while a tracked example has names only.

## Risks / Trade-offs

- [Accepted uploads are buffered by 9A] → the hard 10 MiB cap bounds memory and
  route parsing prevents an unbounded multipart body reaching that buffer.
- [SDK and Node stream failures differ] → normalize at the Node adapter and
  test timeout, missing-object, and byte-preservation behavior through ports.
- [Preflight makes startup asynchronous] → do one awaited check in the existing
  async listener startup; deterministic test storage avoids external MinIO.
- [Compose requires credentials] → require local environment values and keep
  them out of source control and logs.

## Migration Plan

1. Add catalogued S3, image-inspection, and streaming multipart dependencies;
   implement adapters with deterministic seams.
2. Extend application/contracts/server routes, regenerate OpenAPI, and add
   focused route and Node listener tests with fakes.
3. Add Compose MinIO and environment documentation; run quality checks and
   strict change validation.

Deployments must provide the MinIO variables and pre-create the bucket. Rollback
is code/config-only: retain the SQLite database and MinIO objects; no URL or
schema migration is required.
