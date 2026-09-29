## Why

Step 23C of the MVP roadmap must prove that a generated Lace project works outside the source workspace. The 23A generator and 23B operator CLI are implemented, but their current tests run against workspace packages; the generated project still names unpublished `0.0.0` packages, and its Compose images are placeholders. Acceptance must expose and close these deployment seams before Step 24 relies on the generated layout.

## What Changes

- Add an isolated acceptance harness that builds and packs the needed workspace package graph, generates a disposable project, installs only local tarballs, and rejects workspace or source-tree resolution.
- Make the generated Node development and Compose paths usable with packaged engine/admin artifacts and the generated project's own configuration. Keep editable Astro source and configuration in the project; keep engine/admin source out.
- Exercise migration, guarded sync, bootstrap, setup/login, content edit and publish, Astro build, and a Compose production smoke path from the generated directory. Exercise the optional Cloudflare template with a bundle and local Worker smoke path.
- Commit byte-stable generated-tree and ownership-manifest fixtures, plus checks for managed hashes, regenerated output, and credential-safe operator diagnostics.
- Run the acceptance flow in CI with explicit prerequisites and bounded cleanup.

## Capabilities

### New Capabilities

- `generated-project-acceptance`: Isolated package, runtime, deployment, Cloudflare, and snapshot proof for a generated consumer project.

### Modified Capabilities

- `project-generator`: The generated project exposes working Node development and Compose startup paths using versioned engine artifacts and its own configuration.

## Impact

Architecture §7 defines generated ownership, versioned engine delivery, and upgrade metadata; §§23–24 require explicit deployment and no editable admin/engine source. This change follows roadmap Session 23C and the accepted `project-generator`, `operational-cli`, `node-api-composition`, `cloudflare-worker-composition`, and `astro-reference-site` specs. It affects `packages/create-lace`, the package manifests and pack artifacts required by the generated consumer, Node runtime/config loading, generated Compose wiring, acceptance scripts/fixtures, and CI. It does not implement Step 24 upgrades, publish npm packages or production images, deploy to a Cloudflare account, or change the 23B command policy.
