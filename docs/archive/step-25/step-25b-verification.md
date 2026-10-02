# Step 25B verification

Verified on 2026-09-30. Package/generator/image version: `0.1.0-alpha.1`; template: `0.4.0`; npm channel: `next`. Owner-confirmed namespaces: npm `@lacecms`, GHCR `lacecms`. No registry publication, push, remote release or visibility change was performed.

## Prepared artifact set

The full working-tree preview is retained at `.release-artifacts/alpha-preview/inventory.json` (ignored local output). It contains thirteen tarballs and four saved platform images, their SHA-256 checksums and successful smoke results. This preview has `complete: true`, `publicationEligible: false`; its base revision is `7747d76093e3d53f50949c1a5171c0bc097ce508` and its source fingerprint is `8c416b52b79a13c18075f25fe3649e5eb1f7536e3b0fc1f9f0a098b7748058ae`. Local image IDs are not registry digests.

| Runtime | Platform | Local image ID |
| --- | --- | --- |
| api | linux/amd64 | `sha256:ffcf69914882f86ab784ed44d76c220b48a31613abff23e1f7e6eb0bd8d0a8a1` |
| builder | linux/amd64 | `sha256:6d17fb3c6980a983cc3654e25cfd57d28dea5dedb201802d14d0beb44b53c2f7` |
| api | linux/arm64 | `sha256:67e9a032e55e5d88767551e20daba2f18924e23d47fe890612614e543f6bb529` |
| builder | linux/arm64 | `sha256:3786e8fa9e819efab052146718c6f51fa01668d77ec66a55c119c324c18439a3` |

All published-package candidates include the existing MIT license. Applications, root and test-utils remain private. The API runtime image retains only compiled application/admin assets, production dependencies, unchanged migrations and selected operational helpers; the builder retains its fixed command and pinned native-build toolchain.

## Verification

- Release/acceptance tooling: eighteen focused tests passed. The root test command excludes `.release-artifacts/**`, preventing retained source snapshots from being rediscovered as test suites. Release tooling: version/private/missing/circular graph checks, workspace/catalog/local-reference rejection, isolated clean/dirty snapshots, exclusive output claims, injected preparation failure, missing/forbidden archive assets and image platform failure checks passed.
- All thirteen actual packed artifacts passed metadata/content inspection, isolated imports/declaration consumption, CLI help, extracted generator execution and migration resolution. The isolated consumer used pnpm `12.3.4` with a frozen offline reinstall; temporary local overrides never entered delivered archives or templates.
- Generator: twelve tests passed, including the alpha package/image-default contract and five-block Astro onboarding. Default/Cloudflare snapshots matched repeated generation. Compose configuration resolved with default alpha image values and explicit test-only secrets.
- Four image smokes passed: API on `linux/amd64` and `linux/arm64` loaded native SQLite, applied migrations, loaded the mounted generated configuration and served the compiled admin; builder on both platforms ran non-root, had writable work/output mounts, served health and reported pnpm `12.3.4`.
- Node adapter: 63 tests passed. Cloudflare adapter: 65 tests passed. API Worker bundle/smoke and production tests: seven tests passed.
- Root typecheck (including configuration), Oxlint/boundaries, Oxfmt check and strict validation of `step-25b-coherent-alpha-artifacts` passed. The focused release scripts also passed Oxlint.

The baseline Better Auth/SQLite peer-range warning remains unchanged; runtime/native and adapter contracts passed with the pinned versions. It is not a claim of stable compatibility beyond the verified alpha paths.

## Publication boundary

See [alpha-release.md](../../alpha-release.md) for a repeatable clean-source preparation and owner-operated publication procedure. A dirty preview cannot be published. After the final reviewed commit, run `pnpm release:prepare --output .release-artifacts/alpha-1` and verify its inventory; clean preparation must pass before using those exact artifacts in 25C.

25C still verifies the exact artifact consumer journey, essential authorization, secret exclusion, service restart persistence and failed-build/retry behavior. Step 26 retains stable-MVP certification, real Cloudflare deployment and resilience/backup checks. The unscoped `create-lace` name must be rechecked immediately before owner publication.
