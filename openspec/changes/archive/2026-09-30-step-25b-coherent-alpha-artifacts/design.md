## Context

See `proposal.md` for motivation and scope. The consumer's four direct packages (`cli`, `config`, `content`, `sdk`) currently close over twelve runtime packages. `create-lace` is a thirteenth publication artifact, with bundled template assets but no runtime dependency on that graph. The CLI also carries Miniflare to preserve local Cloudflare operations. Removing that functionality is not release packaging work.

The API Dockerfile currently copies the checkout into its final image. Generated Compose relies on `/opt/lace/workspace`, compiled migration/dispatcher paths, and `packages/platform-node/src/minio-init.mjs`. The builder copies compiled service files and runs as `node`; it needs a native-module build toolchain because installation of a generated project includes the CLI's native dependencies. The checked-in `.dockerignore` excludes ordinary `.env` files but requires a broader review of local data and credentials.

Authority remains architecture sections 4.8/6/7/25 and accepted capability specs. npm/GitHub organization ownership is confirmed by the user; the repo remains `jentix/lace`, which does not require transferring the repository into the new organization for manually published images. The unscoped generator name is currently unpublished, with first-publication recheck mandatory.

## Goals / Non-Goals

**Goals:** define one reviewable release, preserve Node/Worker behavior and generated ownership semantics, and make local artifacts independently inspectable and owner-publishable.

**Non-Goals:** automated registry mutation, secrets management infrastructure, repository transfer, a new editable admin package, source bundling into consumer projects, new domain APIs, full 25C acceptance or stable certification.

## Decisions

### 1. One explicit release definition and an audited closure

Add a checked-in release definition (for example `release/alpha.json`) with schema version, package version `0.1.0-alpha.1`, generator version `0.1.0-alpha.1`, template version `0.4.0`, tag `next`, coordinates and platform list. Keep ordinary manifests explicit; preparation validates every relevant value against the definition rather than silently rewriting a divergent working tree.

Public package allowlist: `@lacecms/application`, `auth`, `cli`, `config`, `content`, `contracts`, `db`, `domain`, `platform-cloudflare`, `platform-node`, `sdk`, `server`, plus `create-lace`. Validate the runtime closure of generated root/site dependencies and reject missing/private edges. All apps, root and `@lacecms/test-utils` stay private. Domain/application are not direct consumer APIs, but must be published because the compiled runtime imports them. Bundling every runtime dependency into the CLI was rejected because it changes exports and deployment behavior, complicates native dependencies and duplicates code.

Keep workspace/catalog references in development and use the pinned pnpm pack transformation. Build first, then pack from a disposable staging workspace with release manifests stripped of development-only dependency metadata. This prevents private test-utils references appearing in the public archives without weakening local tests. Promote any type dependency necessary to consume declarations into a shipped dependency when declaration smoke checks demonstrate it is required. Validate the actual tarball metadata, not just source manifests. Preserve existing exported entry points unless an independently reviewed change authorizes removal.

### 2. Compiled assets and executable paths are release contracts

Package files allowlists ship compiled outputs; `db` additionally ships the complete unchanged `drizzle` tree; `create-lace` ships its complete inventory-backed template tree and README. Verify exports/declarations, `lace` and `create-lace` shebang/executable behavior, database migration journal/SQL coverage, and generator execution from extracted artifacts. Include third-party compatibility requirements for Node `>=24.12.0 <25` and pnpm 12. Pin image Node/pnpm to the existing baseline.

Preparation inspects archives for forbidden files/references and validates actual contents after extraction. Focused external tests exercise imports, declaration consumption, CLI help/generation and migration asset resolution. Test-only local resolution is allowed solely in isolated verification, never in delivered metadata. Existing acceptance overrides remain test-only; upgrading them to consume the complete inventory belongs to 25C.

### 3. Minimal final images preserve established runtime paths

Use separate build and final stages. The API final image receives runtime dependency files, compiled package/application outputs, SQL migrations, the bucket-init `.mjs` operational helper and compiled admin assets. Preserve `/opt/lace/workspace`, configuration mount location and existing generated commands; an operational helper is not copied wholesale source. Strip test fixtures, dev tools and editable admin source from final API contents. Supply compatible Hono node-server and any direct runtime dependency missing from manifests rather than depending on dev hoisting.

The builder final image retains its fixed compiled command, non-root user, writable work/output directories and pinned installation toolchain. Native build tooling required for generated-project installs remains intentional. Registry authentication and owner credentials never enter image layers. Build context exclusions cover secret/local-data files; the frozen build input is copied without the contributor's node_modules/dist caches.

Set OCI source label to `https://github.com/jentix/lace`, version and revision labels to the release definition and preparation revision. There is no requirement that the source repository owner equal the image namespace. Domain/database behavior remains unchanged; both platform adapters are packed and existing Cloudflare contract/smoke checks remain in the quality gate.

### 4. Explicit platform artifacts allow publication without rebuilding

Initial support is `linux/amd64` and `linux/arm64`. Build each API/builder platform locally through buildx with `--load`, use platform-suffixed local tags, smoke-test native runtime loading and operational paths, and save each image to an archive. Record image ID and archive checksum; remote manifest digests exist only after owner publication. Full consumer/security behavior is deferred to 25C, but missing migrations, admin assets or native dependencies fail 25B.

The publication guide loads the tested archives, pushes the corresponding platform tags and assembles the versioned multi-platform manifest for each runtime. This avoids `buildx --push` rebuilding a different image during publication. Cross-platform emulation may be required and is a documented prerequisite; inability to test a listed platform is a failure, not evidence of support. Single native-platform previews are allowed, explicitly incomplete relative to the release platform list.

### 5. Generated defaults and independent template identity

Replace `0.0.0` package placeholders with exact alpha versions and populate `.env.example` with `ghcr.io/lacecms/api:0.1.0-alpha.1` and `ghcr.io/lacecms/builder:0.1.0-alpha.1`. Existing Compose variable overrides remain usable; consumers do not build the engine. Keep the pinned third-party MinIO helper build already present in the template; this requirement concerns first-party API/builder images.

Bump ownership template identity from `0.3.0` to `0.4.0`, independently of package SemVer, to preserve the upgrade planner's existing meaning. Update default/Cloudflare snapshots and documentation together. Do not regenerate or overwrite existing user projects, site files or config. The guide names exact alpha installation (`pnpm create lace@0.1.0-alpha.1`) and the `next` channel and states that initial availability depends on later owner publication.

### 6. Local preparation is fail-closed and publication-free

Add root release commands backed by repository tooling for definition checks, package preparation, image preparation, combined preparation and a dry-run plan. Use no publish/push API in these commands. The command accepts an output destination, claims a new staging directory exclusively and refuses existing completed destinations; independent runs use separate staging/source snapshots. On failure retain useful bounded diagnostics and mark the directory incomplete. Write the complete inventory only after all requested phases pass, with phase completeness and overall release eligibility recorded separately.

A normal run requires a clean Git revision and builds an isolated snapshot of that revision, protecting against source changes midway. An explicit dirty preview snapshots the current input, records base SHA plus a content fingerprint, and sets `publicationEligible: false`. Do not conflate dirty preview outputs with committed artifacts. Package-only or platform-subset outputs are valid partial preparation inventories, but not a complete release set. Ignore generated output in Git.

Inventory records schema/version/channel/template/source, graph/publication order, package archive names/SHA-256 and image coordinates/platform/image IDs/archive SHA-256 plus successful checks. A completed run can be verified again against checksums without rebuilding. Exclude credential values from reports. The owner-run guide verifies clean revision and inventories, rechecks npm name rights, publishes exact tarballs with public access and `next`, publishes saved images and makes container visibility public, then verifies downloads. No publication automation or registry token is needed in 25B.

## Risks / Trade-offs

- [Unscoped name availability changes] → Recheck immediately before first publication; on a conflicting owner revise names/templates through OpenSpec rather than publishing an unexpected fallback.
- [Native module incompatibility or dev dependency hoisting] → Smoke both platforms and isolated packed imports/declarations, including SQLite and migration resolution.
- [Large Miniflare/native consumer graph] → Preserve accepted CLI parity and record size; dependency separation is later product work.
- [Slow emulated builds] → Use local buildx/cache and explicit per-platform progress; do not claim untested platforms.
- [Credentials in arbitrary build context or source snapshots] → Exclude local credential/data paths, use release file allowlists and inspect artifacts. Broader role/security journeys remain 25C.
- [Immutable npm versions and partial publication] → Verify existing published name/version/checksums before resuming missing artifacts; changed content requires a new prerelease, never reuse a published version.
- [Clean revision is only available after implementation commit] → Verify working-tree previews during apply; the owner prepares release-eligible artifacts from the final reviewed commit before publication.

## Migration Plan

No new database schema migration. Existing checked-in forward migrations ship unchanged. Release manifest and template updates affect new projects; existing ownership manifests remain valid and upgrades retain hash/conflict checks. After implementation verification, synchronization/archive and the requested commit, repeat preparation from that clean commit before owner publication. If preparation fails, fix and review the source and reprepare; do not publish or erase consumer data. After partial registry publication, recover using verified immutable artifacts or a new prerelease version as documented. 25C verifies the exact prepared set before public release, and Step 26 retains the stable gate.
