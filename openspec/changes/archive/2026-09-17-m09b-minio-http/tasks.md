## 1. Node media infrastructure

- [x] 1.1 Add catalogued Node dependencies for the AWS S3 client, complete image inspection, and streaming multipart parsing; update the lockfile and verify frozen installation plus platform-node typecheck succeeds.
- [x] 1.2 Implement `NodeMinioObjectStorage` with S3-compatible endpoint configuration, AbortSignal-based command timeouts, Node/portable stream conversion, `HeadBucket` startup preflight, and missing-object distinction; verify adapter tests cover put/get byte preservation, deletion, timeout/error normalization, and absent objects without a live MinIO service.
- [x] 1.3 Extend validated Node runtime settings and listener startup to require sanitized MinIO configuration, construct a concrete image inspector and object store, and preflight the bucket before binding; verify invalid settings do not leak values and an unavailable bucket prevents listener startup.

## 2. Portable media reads and REST contracts

- [x] 2.1 Extend `MediaUseCases` and its dependency contracts with authorized preview and published-only binary reads that return MIME, safe filename, and a portable stream without a storage key; verify permission, draft-only/public join, inactive, missing-object, and detached-result tests.
- [x] 2.2 Add shared media list/create/delete DTO schemas and mapping helpers, including safe media URL construction and documented accepted deletion representation; verify contract tests reject invalid IDs/cursors and assert storage keys never serialize.

## 3. HTTP media boundary

- [x] 3.1 Extend the portable Hono input and routes for admin media list, multipart create, asynchronous delete, authenticated preview, and anonymous published media; generate binary headers from verified metadata only and verify OpenAPI includes each JSON endpoint.
- [x] 3.2 Add route-scoped multipart streaming ingestion that requires exactly one `file`, enforces the 10 MiB cutoff independently of JSON body limits, and cancels rejected parsing; verify missing/duplicate parts, MIME spoofing, chunked over-limit input, metadata/store failure, and zero storage writes on rejected uploads.
- [x] 3.3 Add HTTP tests for viewer/editor authorization, safe filename/header injection resistance, draft-only anonymous probing, current-published public streaming, accepted deletion, and sanitized storage failures; regenerate and check in `apps/api/openapi/api-v1.json`.

## 4. Development operations and verification

- [x] 4.1 Add documented `docker-compose.dev.yml` MinIO plus bucket-init services with a persistent named volume and required environment-only credentials; verify `docker compose -f docker-compose.dev.yml config` succeeds when required development variables are supplied and no credential value is tracked.
- [x] 4.2 Run focused package and Node HTTP tests, then `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm openapi:check`, and `pnpm exec openspec validate m09b-minio-http --type change --strict`; resolve every failure before marking this task complete.
