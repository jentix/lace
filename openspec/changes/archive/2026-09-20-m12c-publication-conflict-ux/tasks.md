## 1. Publication transport

- [x] 1.1 Add strict shared DTO schemas/types and mapping for a publish result containing the validated entry, publication outcome, and independent build-dispatch outcome; update contract tests to cover accepted, unavailable, and idempotent replay results.
- [x] 1.2 Change the admin publish route to return the validated publication result from the existing content use case without changing application or persistence semantics; update server route tests to verify the distinct response outcomes.

## 2. Browser publication and status surface

- [x] 2.1 Extend the credentialed admin client with a validated publish operation that sends `expectedRevision` and an idempotency-key header; add focused client tests for request shape and malformed/error responses.
- [x] 2.2 Add editor publication metadata for revision, last editor/time, current published state, and resolved public path, keeping current published output distinct from later draft edits; cover rendering states in component tests.
- [x] 2.3 Implement the admin-only publish affordance, accessible confirmation, captured idempotency key/retry lifecycle, and separate publication/build-dispatch messages; cover editor denial, confirmed admin publication, and network retry in component tests.

## 3. Revision-conflict recovery

- [x] 3.1 Recognize `CONTENT_REVISION_CONFLICT` from save and publish operations and render an accessible non-destructive recovery state; verify focused component tests retain title, slug, fields, blocks, and dirty state after each conflict.
- [x] 3.2 Add explicit reload-server-draft and copy-my-JSON actions with deterministic local draft serialization and sanitized clipboard failure feedback; verify unit/component tests prove reload only happens on selection and copy does not mutate form values.

## 4. End-to-end and full verification

- [x] 4.1 Add Playwright coverage for add/edit/reorder/save, concurrent conflict recovery, editor publication denial, admin publication, and a later draft edit leaving public output unchanged; verify the targeted browser suite passes.
- [x] 4.2 Run focused contracts/server/admin/Playwright tests, then root typecheck, Oxlint, Oxfmt check, and `pnpm exec openspec validate m12c-publication-conflict-ux --type change --strict`; record all passing commands in the implementation result.
