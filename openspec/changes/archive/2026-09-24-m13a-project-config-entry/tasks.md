## 1. Project configuration

- [x] 1.1 Add root `lace.config.ts` with typed home and posts examples, registered blocks and fields, retaining canonical routes and increasing versions for structural changes; verify the root project typecheck and normalization test pass.
- [x] 1.2 Add the fixed root-module loader to the Node development composition, remove the runtime hard-coded development configuration, and update affected package dependencies and test fixtures; verify API build and focused loader tests prove valid projection, missing/invalid-file startup failure, and no request-controlled module selection.

## 2. Contributor workflow

- [x] 2.1 Document model definitions, key/version/`renamedFrom` rules, Astro route/rendering ownership, API restart, and the separate 13B synchronization step in README and Node development guide; verify all referenced paths and commands exist.

## 3. Verification

- [x] 3.1 Run focused config and Node API tests, root typecheck, lint, format check, and strict validation of `m13a-project-config-entry`; verify a clean local development startup uses the root configuration without changing SQLite content when Docker is available.
