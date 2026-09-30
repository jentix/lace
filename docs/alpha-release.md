# Preparing and publishing a Lace alpha

This procedure prepares experimental `0.1.0-alpha.1` artifacts. npm uses the `next` channel, the generator ownership template is `0.4.0`, and API/builder images use the same prerelease version. Nothing in the repository's `release:*` commands publishes, pushes, creates a remote release or changes package visibility. The owner performs publication separately after the exact-artifact consumer/security acceptance in Step 25C. Step 26 remains the stable-MVP gate and real Cloudflare deployment gate.

## Coordinates and ownership

The owner confirmed the npm organization `lacecms` and GitHub organization `lacecms` on 2026-09-30. Public npm metadata returned 404 for the unscoped name `create-lace` that day. This does not reserve it; recheck rights immediately before the first publication. npm organization ownership does not grant rights to an unrelated unscoped package.

| Artifact | Coordinate | Contents |
| --- | --- | --- |
| Generator | `create-lace@0.1.0-alpha.1` | Executable, declarations, templates, ownership inventory, MIT license |
| Runtime graph | `@lacecms/*@0.1.0-alpha.1` | Compiled ESM/declarations and complete registry dependency metadata |
| API/admin | `ghcr.io/lacecms/api:0.1.0-alpha.1` | Compiled API/admin, dispatcher, explicit migrations, bucket initializer and native runtime |
| Builder | `ghcr.io/lacecms/builder:0.1.0-alpha.1` | Fixed-command service, non-root work/output mounts and pinned build toolchain |

The twelve scoped packages are `content`, `config`, `domain`, `application`, `auth`, `db`, `contracts`, `server`, `platform-cloudflare`, `platform-node`, `cli`, and `sdk`. The inventory lists their dependency-safe publication order, followed by the generator. Root, applications and test-utils remain private. The admin is shipped inside the API image; generated projects have no editable admin source.

Both runtime images support `linux/amd64` and `linux/arm64` only when both platform builds and smoke checks pass. Local image IDs are not registry manifest digests. Initial preparation saves one archive per runtime/platform and records its ID and checksum. The public version tag is assembled from those tested platform images during publication.

## Prerequisites

- Node `24.12.0` and project-pinned pnpm `12.3.4`; consumer packages require Node `>=24.12.0 <25`.
- Git, tar, Docker with buildx and the ability to run both Linux platforms (native or emulated), plus enough disk for build layers and four saved images.
- Public dependency/network access for frozen installs and image base/toolchain downloads. Build does not need npm or GHCR publishing credentials.
- A clean reviewed source commit for release-eligible preparation. Registry credentials and local runtime data must remain outside tracked release inputs and build contexts.

## Local preparation

The checked-in `release/alpha.json` is the version/coordinate definition. The validator rejects mismatched manifests, templates, image defaults and private/missing runtime dependencies. It does not rewrite files to hide drift.

```sh
pnpm install --frozen-lockfile
pnpm release:check
pnpm release:plan
pnpm release:prepare --output .release-artifacts/alpha-1
pnpm release:verify --output .release-artifacts/alpha-1
```

`release:plan` is the mutation-free dry-run plan; it does not build or need Docker. `release:prepare` builds the public graph in an isolated source snapshot, packs inspected archives in a disposable workspace, tests an isolated package consumer with test-only overrides, builds/loads both image platforms locally, exercises migrations/configuration/admin/native runtime and builder health, and saves the tested image archives. It does not build the reference Astro site against a live CMS during package compilation.

The output contains `inventory.json`, `status.json`, `packages/*.tgz`, `images/*.tar`, a source snapshot and temporary inspection/build trees. `inventory.json` records definition, source commit/fingerprint, versions, archive SHA-256, image platforms/IDs and checks. Only a successful full set from clean source has both `complete: true` and `publicationEligible: true`. This source-integrity flag does not mean that Step 25C has passed or that anything is published. Verification recomputes every artifact checksum without rebuilding.

For development previews:

```sh
pnpm release:packages --preview --output .release-artifacts/packages-preview
pnpm release:images --preview --platforms linux/arm64 --output .release-artifacts/images-preview
pnpm release:prepare --preview --output .release-artifacts/full-preview
```

`--preview` is always publication-ineligible, even if the working tree happens to be clean. Package-only and platform-subset runs are explicitly incomplete. Output destinations are exclusive: never merge runs or overwrite a prepared directory. On failure, `status.json` reports failure and no complete inventory is advertised. Correct the cause and retry in a new destination. Each snapshot is isolated, and local image tags include its fingerprint to avoid overlapping preparations replacing one another's tags. Do not publish a working-tree preview; repeat full preparation from the final reviewed commit.

Run 25C against the exact clean prepared inventory before publication, keeping generated templates unchanged and using only test-local artifact resolution. Preserve the relevant existing Node/D1/Worker checks. Full authorization, persistence/restart, failed-build/retry and secret-exclusion journeys are 25C; a real Cloudflare account deployment and stable acceptance remain Step 26.

## Owner-operated npm publication

Sign in locally with your own npm account, verify publishing access to `@lacecms`, and recheck the generator name:

```sh
npm login
npm whoami
npm view create-lace maintainers --json
```

An E404 means currently unpublished, not reserved. If it exists and you lack publishing permission, stop and revise the generator name and onboarding commands through OpenSpec. Do not silently fall back to another name. For existing release versions, check published integrity/maintainers before doing anything further.

From the repository root, first review every exact tarball through the npm dry-run. Set the local inventory directory to the clean, 25C-verified output:

```sh
export LACE_RELEASE_DIR="$PWD/.release-artifacts/alpha-1"
pnpm release:verify --output "$LACE_RELEASE_DIR"
node --input-type=module <<'JS'
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const directory = process.env.LACE_RELEASE_DIR;
const inventory = JSON.parse(readFileSync(join(directory, 'inventory.json'), 'utf8'));
if (!inventory.publicationEligible) throw new Error('Requires clean complete preparation');
for (const item of inventory.packages) {
  const result = spawnSync('npm', ['publish', join(directory, item.file), '--dry-run', '--access', 'public', '--tag', inventory.release.channel], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(1);
}
JS
```

After reviewing that output and completing 25C, execute the same owner-operated block with `--dry-run` removed. Publish the exact saved tarballs in inventory order; do not repack or run `npm publish` in source directories. Keep `--access public --tag next`; do not move `latest` during this experimental release. Verify each name/version with `npm view <name>@0.1.0-alpha.1 version dist.integrity` and verify `create-lace@next` points to the intended version.

Published npm versions are immutable. If a run stops midway, compare existing versions' registry integrity with the saved artifacts, record already-published items and resume only the missing ones. A different archive requires a new prerelease version and a new prepared/verified set. Do not overwrite versions or announce a partially published set.

## Owner-operated GHCR publication

Use your GitHub account with publishing rights in organization `lacecms`. For manual Docker authentication, GHCR accepts a personal access token (classic) with `write:packages`; authenticate locally with `docker login ghcr.io` and keep the token outside the repository. The source label remains `https://github.com/jentix/lace`; publishing into the organization does not require a repository transfer. A future GitHub Actions workflow would need separately granted organization/package permissions.

Load the exact saved archives, retag their recorded image IDs to the platform coordinates, and push those tags. Example for the API amd64 artifact (replace the ID with the inventory's actual `imageId`):

```sh
docker load --input "$LACE_RELEASE_DIR/images/api-0.1.0-alpha.1-amd64.tar"
docker tag sha256:<inventory-image-id> ghcr.io/lacecms/api:0.1.0-alpha.1-amd64
docker push ghcr.io/lacecms/api:0.1.0-alpha.1-amd64
```

Repeat using the matching saved archive and ID for API arm64 and builder amd64/arm64. Do not rebuild with `--push`: publication must use the tested archives. Once both platform tags exist for each runtime:

```sh
docker manifest create ghcr.io/lacecms/api:0.1.0-alpha.1 ghcr.io/lacecms/api:0.1.0-alpha.1-amd64 ghcr.io/lacecms/api:0.1.0-alpha.1-arm64
docker manifest push ghcr.io/lacecms/api:0.1.0-alpha.1
docker manifest create ghcr.io/lacecms/builder:0.1.0-alpha.1 ghcr.io/lacecms/builder:0.1.0-alpha.1-amd64 ghcr.io/lacecms/builder:0.1.0-alpha.1-arm64
docker manifest push ghcr.io/lacecms/builder:0.1.0-alpha.1
```

New GHCR packages default to private. For both organization packages, open their Package settings and explicitly set visibility to Public, then verify anonymous pulling and both platform entries with `docker buildx imagetools inspect <versioned-coordinate>`. Record actual remote manifest/platform digests in a separate publication receipt after push; local IDs do not substitute for them. Leave `latest` unchanged.

If publication is interrupted, compare any existing platform tag's config/image identity to the inventory before resuming. Do not overwrite a different image at a released tag. Resume missing platform tags and assemble the full version manifest only once both are verified. Announce availability only after npm and both public image manifests are complete; a consumer must be able to use the generated defaults without an engine checkout or registry credentials.

Official references: [npm organization packages](https://docs.npmjs.com/creating-and-publishing-an-organization-scoped-package/), [GHCR authentication, visibility and image labels](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).
