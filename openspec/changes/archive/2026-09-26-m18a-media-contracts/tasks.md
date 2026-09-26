## 1. Domain and application ports

- [x] 1.1 Add `MEDIA_IN_USE` to `DomainErrorCode` and cover its construction in domain tests (D4)
- [x] 1.2 Add `MEDIA_SORTS`, `DEFAULT_MEDIA_SORT`, `MAX_MEDIA_SEARCH_LENGTH`, `MAX_MEDIA_USAGE_ENTRIES`, `MediaSort`, `MediaCatalogItem`, `MediaUsageState`, `MediaUsageLocation`, `MediaUsageEntry`, and `MediaCatalogPort`; extend `ListMediaInput` and `MediaListPort`; document orientation-applied dimensions on `ImageInspector` (D1, D5)
- [x] 1.3 Update `MediaUseCases`: `MediaView.createdBy` as `ActorSummary` plus `usageCount`, `MediaDetailView` from `get`, validated/defaulted list query, and catalog reloads after create (outside the cleanup `try`) and deletion commands (D1)
- [x] 1.4 Cover list validation-before-read, defaults, uploader names, detail usage, in-use refusal, and create reload behavior in media use-case tests

## 2. Shared contracts

- [x] 2.1 Add `mediaMimeTypeSchema`, `mediaSortSchema`, `MAX_MEDIA_SEARCH_LENGTH`, and `mediaListQuerySchema` (D6)
- [x] 2.2 Change `mediaMetadataSchema` (`createdBy` actor summary, `usageCount`, positive optional dimensions); add usage location/entry schemas, `mediaDetailSchema`, `toMediaDetailDto`, and the updated `toMediaMetadataDto` source (D6)
- [x] 2.3 Add `MEDIA_IN_USE` to `errorCodeSchema` with status `409` and a sanitized message (D4)
- [x] 2.4 Cover the new schemas' success and negative cases (duplicate states, empty locations, over-long usage, bad sort/type/q) and the error mapping in contracts tests

## 3. Adapters

- [x] 3.1 Implement filtered/sorted `listMedia` with uploader names, usage counts, and query-bound version 2 media cursors in `NodeContentRepository` (D2)
- [x] 3.2 Implement `loadMediaCatalogItem` and the CTE-based `loadMediaUsage` with grouped, ordered locations in `NodeContentRepository` (D3)
- [x] 3.3 Classify failed deletion marks and retries as `MEDIA_IN_USE` or `CONTENT_INVALID_STATE` inside the Node write transaction (D4)
- [x] 3.4 Return orientation-applied dimensions from `NodeSharpImageInspector` (D5)
- [x] 3.5 Cover Node search literalness, type filter, every sort paging without gaps, cursor rejection, uploader fallback, usage counts and draft/published locations across publish and edit, truncation, in-use classification, and a rotated JPEG in platform-node tests
- [x] 3.6 Implement the same list, catalog, usage, and in-use semantics in `InMemoryContentStore` and cover parity in test-utils tests

## 4. HTTP routes, OpenAPI, and admin client

- [x] 4.1 Wire the media-list query validator, the new media DTO mapping, and `GET /api/v1/admin/media/:mediaId` with `404` for unknown IDs (D6)
- [x] 4.2 Cover list filters, validation pointers, cursor mismatch, detail usage, unknown detail, and `MEDIA_IN_USE` in server tests; regenerate `apps/api/openapi/api-v1.json`
- [x] 4.3 Update the admin client (`listMedia` query, `getMedia`, `mediaDetail` query key), the deletion refusal message, and admin fixtures/tests for the new DTO (D7)

## 5. Documentation and verification

- [x] 5.1 Note display dimensions, usage derivation, the media-list query, the media detail route, and `MEDIA_IN_USE` in architecture §9.7 and §12
- [x] 5.2 Run focused package tests, root typecheck, lint, format check, OpenAPI check, and `openspec validate m18a-media-contracts --type change --strict`
