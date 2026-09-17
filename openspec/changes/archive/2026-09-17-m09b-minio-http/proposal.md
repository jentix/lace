## Why

Session 9A provides validated, metadata-only media use cases, but Node deployments
still use a failing placeholder store and expose no media transport. Step 9B must
make verified images usable through MinIO-backed storage while keeping draft
assets private and public URLs stable.

## What Changes

- Implement roadmap Step 9, Session 9B: a Node S3-compatible MinIO adapter with
  bounded streaming operations, request timeouts, and startup bucket checks.
- Add validated admin media upload, list, delete, and authenticated preview
  routes, plus an anonymous stable public media route that serves only media
  referenced by a currently published snapshot.
- Extend Node runtime configuration/composition to require safe MinIO settings
  and wire the storage-backed media use cases and readiness behavior.
- Add a development Docker Compose topology with persistent MinIO data and
  environment-provided credentials; no production credential is committed.
- Cover hostile filename and response-header inputs, declared-MIME mismatch,
  streaming size cutoff, anonymous draft probing, and object-store/metadata
  failure cases. Recoverable asynchronous object deletion remains Session 9C.

## Capabilities

### New Capabilities
- `node-minio-object-storage`: Node's private S3/MinIO object-store adapter,
  startup verification, timeout behavior, and streamed object access.

### Modified Capabilities
- `media-use-cases`: Extend the media lifecycle's verified objects to support
  safe downstream serving without revealing internal object keys.
- `rest-contracts`: Define request, response, and error representations for
  media upload, list, deletion, and binary delivery.
- `hono-app-factory`: Add authorization-aware admin media and published-only
  public media HTTP routes.
- `node-api-composition`: Replace placeholder media storage with validated
  MinIO composition and bounded storage-aware readiness at startup.

## Impact

- Affected packages: `@lacecms/platform-node`, `@lacecms/server`,
  `@lacecms/contracts`, `@lacecms/application`, and Node/API integration tests;
  adds the AWS S3 client dependency and development Compose configuration.
- Relies on the Step 5 media/reference schema and the Step 9A media lifecycle
  ports. It follows architecture §§4.5–4.7, §6, §12 and roadmap Step 9B.
- No database migration or binary-in-SQL behavior is introduced. Cloudflare/R2,
  signed URLs, transformations, and outbox-driven deletion are out of scope.
