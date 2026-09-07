## 1. Portable validation foundation

- [x] 1.1 Add the catalog-pinned Valibot runtime dependency to `@lacecms/content` and update the public-entry-point types without introducing Node-only imports; verify the frozen workspace install and content package build succeed.
- [x] 1.2 Implement and export the exhaustive `FieldDefinition` visitor, compiled field-schema API, inferred runtime-value types, and normalized path-aware validation issue contract; verify compile-time tests fail for a deliberately incomplete visitor and pass for all current field kinds.

## 2. Field-record and system-payload validation

- [x] 2.1 Compile validators for all ten field descriptors, preserving constraints and adding calendar-date, UTC-datetime, non-empty media-ID, and approved-URL semantics; verify runtime table tests accept valid values and reject every wrong type/constraint at its field path.
- [x] 2.2 Implement draft/publish model-field record validation with strict unknown-key rejection, default application, draft optionality, and publish requiredness; verify focused tests cover incomplete drafts, failed publication, defaults, and unknown fields.
- [x] 2.3 Export entry-system validation and shared title, slug, block-count, and JSON-byte constants; verify focused tests cover required draft titles, publish-only collection slugs, every boundary value, oversized UTF-8 payloads, and over-limit block lists.

## 3. Safe rich text and portable canonical data

- [x] 3.1 Implement the confirmed closed Tiptap document type/validator and shared URL policy for rich-text links and URL fields; verify tests cover every allowed node/mark and reject raw HTML, unknown nodes/marks/attributes, malformed trees, protocol-relative URLs, and scriptable URLs with stable paths.
- [x] 3.2 Implement canonical JSON serialization with recursive object-key sorting and preserved array order plus asynchronous Web Crypto SHA-256 hexadecimal hashing; verify committed canonical string/digest fixtures in Node and a Worker-like Web Crypto/TextEncoder test environment.

## 4. Regression and change verification

- [x] 4.1 Extend metadata round-trip and type-inference tests to prove runtime schemas and callbacks never appear in serializable metadata and optional/default behavior remains aligned; verify `pnpm --filter @lacecms/content test` and `pnpm --filter @lacecms/content type-test` pass.
- [x] 4.2 Run `pnpm --filter @lacecms/content build`, `typecheck`, and `lint`, then root `format:check`, `lint`, `typecheck`, `test`, `build`, and `pnpm exec openspec validate m02b-validators-canonical-data --type change --strict`; verify every command passes and record no untracked required behavior remains.
