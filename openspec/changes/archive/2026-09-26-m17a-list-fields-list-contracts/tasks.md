## 1. Configuration list fields

- [x] 1.1 Add typed optional `listFields` to `CollectionModelInput` and `CollectionModelDefinition`, validate it in `defineCollection` (array, unique, declared scalar field types only; empty normalizes to absent), and add type tests for valid and unknown keys (D1)
- [x] 1.2 Exclude top-level `listFields` from per-model and whole-configuration structural hashes while keeping it in projection hashes (D1)
- [x] 1.3 Cover list-field acceptance, ordering, rejection cases, empty omission, hash behavior, and sync `label-update` classification in config/application tests

## 2. Shared contracts

- [x] 2.1 Add `contentEntryStatusSchema`, `contentEntrySortSchema`, `actorSummarySchema`, list-value and totals schemas, the extended `contentEntrySummarySchema` with status consistency check, and the `totals`-bearing `contentEntryListSchema` (D3)
- [x] 2.2 Add `contentEntryListQuerySchema` with trimmed `q`, status, sort, limit, and cursor validation (D7)
- [x] 2.3 Add `adminContentEntrySchema`, `toAdminContentEntryDto`, and switch `publishContentEntryResultSchema.entry` to the admin entry DTO while keeping public entry schemas unchanged (D6)
- [x] 2.4 Add optional `listFields` to `contentModelSchema`/`toContentModelDto` with page, empty, duplicate, and unknown-field rejection
- [x] 2.5 Cover the new schemas' success and negative cases in contracts tests

## 3. Application ports and use cases

- [x] 3.1 Extend `ContentEntrySummary`, `ListContentEntriesInput`, and the read port with status, sort, totals page, `describeActors`, `ActorSummary`, `foldAscii`, and `actorDisplayName` (D3, D4, D6)
- [x] 3.2 Make `ContentUseCases.list` resolve the model, validate and normalize `q`/status/sort, and pass `listFields`; add `describeActor` requiring `content:read`
- [x] 3.3 Cover authorization, validation-before-read, defaults, and display-name fallbacks in application tests

## 4. Adapters

- [x] 4.1 Implement search, status filter, all sorts, totals, list values, and display names in `InMemoryContentStore` with query-bound offset cursors and seeded names (D4–D6)
- [x] 4.2 Implement the Node list query with derived status, `publishedAt`, `LEFT JOIN user`, list values, totals, and v2 query-bound cursors; implement `describeActors` (D2, D4–D6)
- [x] 4.3 Cover Node status transitions, totals, literal search, every sort paging without gaps, cursor rejection, missing-user fallback, and default-sort index use in platform-node tests; cover in-memory parity in test-utils tests

## 5. HTTP routes, OpenAPI, and admin client

- [x] 5.1 Wire the list route query validator and new summary/totals mapping; return `adminContentEntrySchema` with `updatedBy` from load, create, save, and publish routes; pass `listFields` through model DTOs (D6, D7)
- [x] 5.2 Cover list filters, validation pointers, cursor mismatch, admin `updatedBy`, and unchanged public DTOs in server tests; regenerate `apps/api/openapi/api-v1.json`
- [x] 5.3 Update the admin client to the admin entry DTO and optional list query, and update admin fixtures/tests for the new required fields (D8)

## 6. Configuration, documentation, and verification

- [x] 6.1 Declare `listFields` on the reference `posts` collection and note list fields and admin list contracts in architecture §8 and §12
- [x] 6.2 Run focused package tests, root typecheck, lint, format check, OpenAPI check, and `openspec validate m17a-list-fields-list-contracts --type change --strict`
