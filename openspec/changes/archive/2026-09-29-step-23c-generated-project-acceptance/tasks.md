## 1. Isolated package consumer

- [x] 1.1 Build and pack the generated project's Lace dependency closure into temporary tarballs; verify `pnpm install` in a generated directory succeeds with tarball references and no workspace links or source-checkout resolutions.
- [x] 1.2 Add a reusable acceptance runner with unique temporary paths, bounded child processes, redacted logs, and guaranteed cleanup; verify a forced failure reports its stage without printing secret sentinels or leaving test processes.

## 2. Generated runtime and deployment

- [x] 2.1 Complete the generated Node development commands and project configuration mount for the versioned API image; verify the generated API reads its own config and reaches readiness after explicit migration.
- [x] 2.2 Extend the fixed-command builder for the exact generated `site/` layout, then complete the generated Compose services, volumes, health gates, and image variables; verify builder tests, `docker compose config`, and a local image smoke from the generated directory, including explicit migration and cleanup.
- [x] 2.3 Run generated CLI migration, guarded sync, and bootstrap followed by setup/login, edit, publish, and Astro build; verify built HTML contains the published edit and failure output does not repeat credentials.

## 3. Cloudflare and contract fixture

- [x] 3.1 Bundle the optional generated Cloudflare site configuration and run the local Worker smoke path; verify no remote account credential is required and the default variant omits Cloudflare files.
- [x] 3.2 Add default and Cloudflare generated-tree and ownership-manifest snapshots; verify two fresh generations match each other and the fixtures, all managed SHA-256 values match exact bytes, and no editable engine/admin source or usable secret appears.

## 4. Documentation and verification

- [x] 4.1 Document generated Node, Compose, and optional Cloudflare local acceptance commands and prerequisites; verify each documented command against a disposable generated project.
- [x] 4.2 Wire the full generated-project acceptance into CI, run focused tests and the acceptance command, then root typecheck, Oxlint, Oxfmt check, and strict OpenSpec change validation; verify all gates pass.
- [x] 4.3 Replace the withdrawn MinIO image reference in the generated Compose path with a pinned-source build, verify a cold local image build and full generated acceptance, then rerun focused and root quality gates before re-archiving.
- [x] 4.4 Allow a cold Linux builder to complete within bounded acceptance time, include safe persisted build-state diagnostics, and verify the revised full acceptance and quality gates before re-archiving.
