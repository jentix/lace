# Step 25C verification

Verified on 2026-09-30 with Node `24.12.0`, pnpm `12.3.4`, package/generator/image version `0.1.0-alpha.1`, template `0.4.0` and channel `next`. No npm publication, GHCR push, remote release or visibility change was performed.

## Exact artifact set

Prepared from clean source revision `fd65ca34d7fd1ab2aae9eb1c5270d9f3bc01053a`, fingerprint `741f6b4d92d76410aa612eaece23710d99b5fe6b2348c5c3468f76c29945bb01`, using `pnpm release:prepare --output .release-artifacts/alpha-25c`. The retained ignored inventory has `complete: true`, `publicationEligible: true`, thirteen inspected package archives and four saved runtime images. This eligibility denotes clean preparation; the consumer acceptance is a separate check.

The full local consumer journey runs on `linux/arm64`; independent preparation build/native/config/admin/builder smokes also passed on `linux/amd64`. This does not claim amd64 end-to-end consumer coverage. [step-25c-artifacts.json](./step-25c-artifacts.json) records every tested package/archive checksum, both image platforms and the consumer receipt. Image IDs are local config identities, not remote registry digests.

| Runtime | Platform | Local image ID |
| --- | --- | --- |
| API | linux/amd64 | `sha256:c225a7b8ba83f56bdc4d0a55f57f57a6e29206425b55d6a4fb4b6187848f939e` |
| Builder | linux/amd64 | `sha256:d732949dfc06c49ab0afab8dbeb67a25b9d4ac6d61595a9e28268163f3979e97` |
| API | linux/arm64 | `sha256:6cab80fd9d13aa521358ba32cd85748f473b178bfde026eb93b456dfb2b956b7` |
| Builder | linux/arm64 | `sha256:46c858317d867c76cfeeca3d61f24c8daee7709242832ec0a2c24a74bbc89634` |

The 25C change adds verification tooling and evidence, without changing shipped runtime packages, generator templates or image source. Publication of a future source revision requires preparing a new clean set and rerunning acceptance against that exact inventory. The older 25B dirty preview is not the tested publication candidate.

## Consumer and security checks

`pnpm acceptance:release --artifacts .release-artifacts/alpha-25c` verifies checksums, extracts/inspects the archives, executes the packed generator, installs its exact runtime graph outside the checkout, and performs a frozen offline reinstall. Only disposable package references/overrides select tarballs; lockfile/source-resolution checks reject workspace dependencies. API/builder images are loaded from the saved archives and selected by immutable ID with matching platform/version/source labels. Delivered archives, generator templates and consumer-owned source are unchanged; the ownership manifest remains byte-identical.

- Explicit migrations and config sync, one-time bootstrap/setup, administrator login, draft edit, upload and reuse of one image in hero/image blocks, publication, Astro build and typecheck passed. HTML contains all five block selectors and browser-facing media URLs return the original PNG bytes outside Docker.
- Editor and viewer logins work but publication, user-management and build requests return `403`. Anonymous and build-token callers cannot read draft entry detail, content-model admin resources, users or build history, or publish. Only the build token reads published export; cookie-only and anonymous export access is denied. Completed setup returns `404` and token listings never repeat plaintext credentials.
- A later draft changes the title/hero while retaining media references. The authenticated published export remains byte-equivalent, and rebuilt HTML retains the earlier title/blocks until explicit publication.
- Generated Compose starts the dispatcher and fixed-command builder and serves a successful static release. A random invalid build token causes eight failed attempts and terminal failure while served HTML remains byte-identical. Only disposable retry availability timestamps are accelerated. Restoring the token and using the supported administrator retry endpoint produces a succeeded durable build and serves the newer published state.
- Services are stopped with `down --remove-orphans` and recreated without deleting volumes. Draft detail, published export, original uploaded object bytes and the current static release remain available afterward.
- Generated shipping files, all extracted archives, selected API/builder image configurations and exported filesystems, host static output, served releases and captured command/service diagnostics pass credential exclusion. Run passwords, setup/build tokens, cookies, auth/builder secrets and object-store credentials are scanned as exact bytes, including binary streams. Shipping text files and image runtime text trees (`/opt`, `/usr`, `/etc`, `/root`) are additionally checked for complete PEM private-key blocks and registry authentication assignments in npm configuration. The Node base image's bundled `usr/local/lib/node_modules/npm/.npmrc` is permitted only as shipped tool configuration; it contains no authentication directives. Operator credential paths remain forbidden. Format-header constants and embedded binary crypto-library strings are not treated as deployed private keys. Intentional bootstrap reveal, operator `.env`, installed dependencies and auth database are outside shipping scans.
- Disposable Compose services, volumes, scanner containers and temporary consumers are removed after the run. Failure diagnostics redact known secrets.

## Regression and quality checks

- Release/security/acceptance tooling: 24 tests passed, including altered archive, ineligible inventory, image identity mismatch, redaction, stream-boundary leakage and cleanup cases.
- Node adapter: 63 tests passed. Cloudflare adapter/local D1: 65 tests passed. API/production/Worker smoke: 22 tests passed.
- Generator/onboarding: 12 tests passed. Default and Cloudflare tree/ownership snapshots match two regenerations each.
- Root typecheck, Oxlint/boundary/color checks, focused tooling Oxlint, Oxfmt check and strict OpenSpec validation passed.

The pinned Better Auth/SQLite peer-range warning remains an experimental compatibility limit; native/runtime contracts passed. No product fix or undocumented consumer renderer/Compose patch was required.

## Remaining release boundaries

See [alpha-release.md](../../alpha-release.md) for preparation, acceptance and explicit owner-operated publication. Recheck unscoped `create-lace` availability/permissions immediately before publication, and use exact tested archives/images rather than rebuilding during push. This first alpha is suitable for subsequent independent personal testing; it does not declare a stable MVP.

Step 26 still covers full browser-role/session/conflict flows, vulnerability/license review, broader failure injection, maximum D1 budgets, backup/restore drills and complete operational traceability. Full Cloudflare consumer onboarding follows local feedback; a real Cloudflare account deployment is still unverified. A remote VPS was not required or claimed by these local Compose checks.
