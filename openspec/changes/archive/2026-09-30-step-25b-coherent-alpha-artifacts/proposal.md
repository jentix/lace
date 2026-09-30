## Why

Roadmap Step 25, session **25B — Coherent alpha packages and runtime artifacts**, must turn the verified 25A starter into a prepareable release: its current runtime dependencies are `0.0.0`, most packages are private, and its image coordinates are empty. Consumers need matching installable packages and prebuilt runtimes before 25C can verify the exact alpha artifact set.

## What Changes

- Establish `0.1.0-alpha.1` for the publishable package graph, generator and API/builder images, template version `0.4.0`, npm channel `next`, and one recorded source revision per prepared set.
- Use the owner-confirmed npm organization `lacecms` and GitHub organization `lacecms`: npm `@lacecms/*`, unscoped `create-lace`, and `ghcr.io/lacecms/api` / `ghcr.io/lacecms/builder`. Public npm metadata returned 404 for `create-lace` on 2026-09-30; this is availability evidence, not ownership or reservation. Recheck immediately before publication and stop on a conflicting owner.
- Make the complete consumer runtime dependency closure publishable, with compiled exports, working executables, migrations and generator templates; leave apps, the root and test-utils private. Preserve workspace references for development while verifying pnpm-packed metadata resolves exact release versions and catalog versions.
- Prepare versioned API/admin and builder images, exclude checkout-only files from runtime stages, and document verified platform support and toolchain requirements.
- Give generated projects matching default image references and exact package versions while retaining operator image overrides and all ownership protections.
- Add repeatable local preparation, validation, inventory and dry-run commands, plus an owner-operated publication procedure. No preparation command publishes or requests registry credentials.

## Capabilities

### New Capabilities

- `alpha-release-artifacts`: coherent package/image preparation, version checks, inventories, platform evidence and explicit publication boundaries.

### Modified Capabilities

- `project-generator`: generated projects select the release's matching default packaged runtimes without discovering coordinates or building engine source.

## Impact

Grounding: architecture sections **4.8, 6, 7, 25**; roadmap **25B**; accepted `workspace-governance`, `project-generator`, `generated-project-onboarding`, `generated-project-acceptance`, `operational-cli`, `vps-composition` and `fixed-command-vps-builder` specs. The initial-private workspace requirement remains applicable to initial development; this change deliberately introduces release manifests for the runtime closure.

Affected areas: package manifests/lockfile, generator inventory and templates, generated snapshots, API/builder Dockerfiles and Docker context exclusions, release tooling/tests and release documentation. The current API image copies the checkout and installs development dependencies; generated MinIO initialization invokes an image-internal `.mjs` helper that must remain shipped or receive a synchronized path update. Admin remains a compiled asset bundle, never an editable generated app.

Depends on completed 25A and existing Node/Cloudflare CLI/runtime behavior. Publication is performed later by the owner with assistance, as explicitly requested in this conversation. Full exact-artifact consumer/security acceptance belongs to **25C**; remote Cloudflare deployment, stable release certification, new content features, runtime domain changes and general content migrations are out of scope. No schema/data migration is introduced; existing SQL migrations must be included intact.
