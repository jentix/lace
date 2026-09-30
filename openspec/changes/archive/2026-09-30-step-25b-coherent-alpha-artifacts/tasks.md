## 1. Release definition and package graph

- [x] 1.1 Add the explicit alpha release definition and graph/version validator described in design decision 1; verify positive coverage for the thirteen publication artifacts and negative coverage for mismatched versions, private/missing runtime dependencies and template/image drift (`Alpha coordinates form one compatible release set`).
- [x] 1.2 Prepare public manifests with `0.1.0-alpha.1`, public access, engine requirements and complete runtime/type dependencies while keeping root/apps/test-utils private; refresh the lockfile using pinned pnpm and verify frozen install, closure checks and existing package-boundary enforcement pass.

## 2. Local package preparation and verification

- [x] 2.1 Implement isolated source snapshots, clean-revision enforcement, explicit dirty-preview fingerprinting, exclusive output staging, dry-run planning and structured partial/complete inventory handling; verify dirty inputs, concurrent destination collision and injected failures never produce a publication-eligible complete set (`Preparation produces an auditable recoverable inventory`).
- [x] 2.2 Implement dependency-ordered build/pack from a disposable packaging workspace, stripping development-only metadata and preserving pnpm workspace/catalog resolution; verify actual tarball manifests contain exact Lace release versions and no unresolved/local/private dependency references (`Packed artifacts are complete external packages`).
- [x] 2.3 Add archive inspection and isolated package smoke checks for compiled exports/declarations, executable paths/shebangs, unchanged SQL migration inventory and complete generator templates; verify extracted generator execution and CLI help succeed, external declaration consumption passes, and missing assets/forbidden files are rejected.

## 3. Coherent generated project

- [x] 3.1 Update generated direct dependencies to exact alpha versions, template identity to `0.4.0`, and `.env.example` to matching GHCR API/builder defaults; verify generator tests assert matching versions/coordinates, explicit image overrides and unchanged ownership protections (`Generated project starts its packaged runtimes`).
- [x] 3.2 Update generated operations instructions and default/Cloudflare snapshots with alpha installation/channel and publication prerequisites; verify generator onboarding tests, snapshot checks and Compose configuration resolution pass without introducing consumer API/builder build steps or usable secrets.

## 4. Versioned runtime images

- [x] 4.1 Refactor API image into build/runtime stages shipping the compiled API, admin, dispatcher, migration assets, runtime graph and required bucket initializer at compatible paths; improve build-context exclusions and add version/revision/source labels; verify the final filesystem excludes checkout-only application source/tests, local data and credentials and all generated operational paths exist (`Runtime images ship compatible compiled applications`).
- [x] 4.2 Prepare the builder image with matching OCI metadata, compiled fixed-command service, pinned Node/pnpm/native build toolchain and existing non-root mount semantics; verify image inspection, health startup and writable work/output behavior without changing request or publication semantics.
- [x] 4.3 Add per-platform local buildx build/load, image inspection/smoke, saved image archives and inventory checksums for API/builder; verify platform or native-runtime failure fails preparation, partial platform output remains explicitly incomplete, and no push command is invoked.
- [x] 4.4 Build and smoke-test API and builder on both `linux/amd64` and `linux/arm64`, including native SQLite loading, explicit migrations/config loading, compiled admin serving and builder health; record real local image IDs/archive checksums and platform results, leaving remote digest fields unclaimed. Use the same source snapshot as package preparation; working-tree artifacts remain labeled previews.

## 5. Owner-operated publication guide and quality gates

- [x] 5.1 Deliver the release preparation/publication guide with prerequisites, inventory verification, `create-lace` rights/availability recheck, exact tarball publication using public access and `next`, saved platform-image publication and versioned manifest assembly/public visibility, plus partial-publication recovery; verify documented preparation/dry-run commands execute without registry publishing authentication or remote mutations (`Publication is a separate owner-operated action`).
- [x] 5.2 Update architecture section 25's resolved npm/GHCR coordinates and roadmap 25B status/verification evidence without weakening 25C/26 boundaries; verify documentation records exact prepared versions, successful platforms, preview versus clean-revision status, and the required clean-commit reprepare before publication.
- [x] 5.3 Run focused release tooling/archive tests, generator/onboarding/snapshot checks, relevant Node/D1 and Worker contract/smoke checks, then root `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm exec openspec validate step-25b-coherent-alpha-artifacts --type change --strict`; record results and resolve all blocking failures before marking 25B implementation complete.

Synchronization/archive and the requested implementation commit follow the explicit repository lifecycle after verified apply. They are not public publication; prepare the release-eligible inventory again from the final clean reviewed commit before the owner proceeds with the 25C/publication sequence.
