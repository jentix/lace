## 1. Explicit builder selection

- [x] 1.1 Implement deployment-only builder site/output settings and installation validation described in design decisions 1–2; verify generated `site`, standalone `.`, external workspace package, missing mount/lockfile, independent nested lockfile, non-Astro package, traversal, option-like paths and symlink cases with focused builder tests.
- [x] 1.2 Replace layout inference with filtered copying of the selected installation, excluding configured output and nested CMS `.lace/data` as well as existing excluded files; verify scratch copies contain required source and root lockfile while credential/database/output sentinels and user-source mutations remain absent.
- [x] 1.3 Replace package build-script selection with frozen root install and fixed direct Astro argument arrays for the selected directory/output; verify tool invocation, standalone/workspace dependencies, failed installs/builds, static output validation, published-version races and preserved atomic releases using the builder suite.
- [x] 1.4 Wire production builder entrypoint and reference Compose explicit `apps/site` selection with read-only non-creating source binds; verify Compose rendering and real mounted reference build, and retain server tests rejecting every extended HTTP trigger and serializing concurrent requests.

## 2. Portable current-site identity

- [x] 2.1 Add strict bounded identity/selection DTO schemas in contracts and `GET /api/v1/admin/build-site` in server with `content:read`; verify all authenticated role reads, anonymous denial, null identity, invalid/extended DTOs, no mutation route, unchanged build request/retry contracts and generated OpenAPI consistency.
- [x] 2.2 Load explicit identity settings in Node and Worker composition without filesystem leakage or new persistence; verify both runtimes expose equivalent configured/null results and reject partial/invalid identity at startup without values, secrets or paths in diagnostics.

## 3. Admin presentation

- [x] 3.1 Add validated identity transport/cache and a current-site section shared by Builds and administrator Settings; verify label/ID and unconfigured states, empty history, unchanged historical rows and preserved editor/viewer read-only behavior through focused admin tests.
- [x] 3.2 Cover independent identity loading/error/retry and expired-session recovery while history remains usable; verify Settings retains its administrator guard, successful identity does not claim deployment readiness and the UI exposes no path or site-selection mutation.

## 4. Generator and operator guidance

- [x] 4.1 Update generated Compose/env with explicit default source/site/output/identity, shared API/builder identity inputs and a read-only bind refusing missing host directories; verify default and external standalone/workspace Compose rendering and deterministic secret-free generated inventory.
- [x] 4.2 Advance template version to `0.7.0` and provide upgrade instructions; verify managed hashes, changed-managed-file conflicts, preserved existing README/config/site bytes and compatible-artifact guidance with generator/upgrade tests.
- [x] 4.3 Update generated README/operations, builder and relevant repository deployment docs with standalone/workspace examples, root lockfile/mount/output interpretation, existing-site SDK/rendering prerequisites, failure/retry and artifact compatibility; verify examples match actual commands and preserve internal export versus public media origins without making unverified 29B refresh claims.

## 5. Consumer acceptance and completion

- [x] 5.1 Extend isolated consumer acceptance using compatible packed packages and built images for default generated, real external standalone and real external workspace sources alongside `cms/`; verify served HTML identifies the selected real site instead of a distinct unused example, frozen installs and SDK/version integration work without engine checkout, and record tested artifact identities.
- [x] 5.2 Exercise invalid/inaccessible mounts, failed selected-source build, administrator correction/retry and serialized build handling in acceptance; verify the last complete release remains served until success, source stays unchanged and output/diagnostics exclude secret and private-path sentinels.
- [x] 5.3 Run the relevant focused suites and consumer checks, then root `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm openapi:check` and `pnpm exec openspec validate operator-selected-astro-source --type change --strict`; record results and only then mark implementation complete. Sync/archive and the requested branch commit follow completion under their respective workflows.
