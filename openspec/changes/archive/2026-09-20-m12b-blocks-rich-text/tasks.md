## 1. Model block-metadata transport

- [x] 1.1 Define strict portable block-metadata DTO validation and add the optional per-model allowed `blockDefinitions` projection without changing the existing type-key list; verify contracts tests accept valid detached metadata and reject executable, malformed, duplicate, or model-mismatched definitions.
- [x] 1.2 Extend the server configuration/model response mapper to derive only each model's allowed block definitions from the safe configuration projection; verify server route tests return valid metadata and preserve the existing response behavior for models without blocks.

## 2. Admin client and local aggregate rules

- [x] 2.1 Add a validated paginated media-list operation and query key to the credentialed admin client; verify request, response, and sanitized failure handling in focused client tests.
- [x] 2.2 Extend browser-safe draft validation and JSON Pointer mapping for block key format/uniqueness, allowed metadata type/version, nested data fields, rich text, URLs, and server block paths; verify unit tests cover valid draft blocks and each rejected/mapped case.
- [x] 2.3 Add the approved Tiptap and accessible sortable/ULID dependencies through pnpm workspace configuration, with no raw-HTML extension; verify the admin package resolves and typechecks them.

## 3. Generic rich-text and media controls

- [x] 3.1 Refactor metadata-driven controls into reusable model-field and block-data field renderers; replace the rich-text JSON textarea with an explicit-allowlist Tiptap control that emits only validated structured documents; verify component tests cover safe formatting and rejected unsafe document/link input without a save request.
- [x] 3.2 Implement the generic on-demand media selection placeholder for metadata media fields with active-item selection plus loading, empty, and failure states; verify component tests preserve values on failure and submit the selected block media identifier.

## 4. Ordered block authoring

- [x] 4.1 Implement the allowed-block add menu and generic block cards with detached defaults, browser-generated unique ULID keys, sparse local positions, duplicate, remove, and presentation-only collapse controls; verify component tests cover allowed choices, keys, detached duplicate data, and collapse behavior.
- [x] 4.2 Implement one accessible keyboard and pointer/drag reorder path backed by the same ordered form array; verify component tests observe matching visible/save order and no data mutation after reordering.
- [x] 4.3 Integrate block cards into the complete-draft editor save/reset flow so it sends the ordered list and adopts only returned canonical positions; verify component tests cover a successful normalized response and a server block-validation failure retaining values with a nested accessible error.

## 5. Verification

- [x] 5.1 Run focused content/contracts/server/admin tests, then root typecheck, Oxlint, Oxfmt check, and `pnpm exec openspec validate m12b-blocks-rich-text --type change --strict`; record all passing commands in the implementation result.
