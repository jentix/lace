## 1. Additional code-owned routes

- [x] 1.1 Define `about` and `notes` in the root config with a sample field and permitted blocks; verify normalized configuration and versioned model definitions in focused config tests.
- [x] 1.2 Extend the published export projection and add matching Astro route files using the existing renderer; verify canonical paths, duplicate slug rejection, and draft-only isolation in site tests.
- [x] 1.3 Extend the committed fixture for the new routes; verify a fixture build emits all four route families and omits later draft values without a CMS request.

## 2. Local content proof and guidance

- [x] 2.0 Accept canonical ULID-format aggregate block keys while preserving named keys and malformed-key rejection; verify focused content validator tests and a real Admin block save.
- [x] 2.1 Add a repeatable browser-level live-stack flow that verifies sync, Admin editing, publication, published-only API output, Astro URLs, and later draft isolation; run it where the local Docker/browser environment is available and record any environmental limitation.
- [x] 2.2 Document the new page, collection, field, and block authoring sequence, config version rules, sync, publication, and site refresh; verify command and route names against the code.

## 3. Final verification

- [x] 3.1 Run focused tests, root typecheck, Oxlint, Oxfmt check, and strict OpenSpec validation; resolve any failures.
