# Step 29A verification

Verified on 2026-10-03 with Node 24.12.0, pnpm 12.3.4 and local Linux/arm64
Docker images in branch `codex/step-29-build-site-guidance`.

## Delivered behavior

The deployment selects its read-only source installation, relative Astro project
and relative static output explicitly. Generated defaults are `.`, `site` and
`dist`; standalone sites select `.`, and external workspace packages select their
own directory. Reference Compose selects `apps/site`. Missing host binds are
not created. The HTTP trigger still accepts only build ID and target version.

The builder validates the root lockfile, direct Astro dependency, relative paths
and regular files; it rejects independent nested installations, links and special
files. It copies filtered source into scratch, installs from the frozen root
lockfile and runs the fixed direct Astro command. Configured output, environment
credentials, dependencies, Git data and nested CMS `.lace/data` are excluded.
The reference Astro configuration bundles its local SDK dependency graph from
source because old dependency `dist` directories are excluded. No package build
script is selected by the builder.

The authenticated current-site endpoint returns only a bounded operator-authored
ID and label or null. Node and Worker expose the same response. Builds displays
current configuration for every role; administrator Settings displays it too.
Loading, failure/retry and expired sessions use existing flows. Current identity
does not attribute historical build rows or verify deployment readiness.

The generated ownership template is 0.7.0. Compose, environment examples and
operations describe external standalone/workspace mounts, lockfiles, direct
static builds, user-owned SDK/rendering integration, distinct internal export
and public media origins, and correction/retry. Reserved upgrade instructions
remain metadata outside the managed-file inventory, as required by the existing
upgrade planner. Upgrades retain managed hash/conflict checks and preserve user
README, config and site bytes.

## Checks

- Builder: 4 files, 25 tests passed, including fixed argument arrays, standalone
  and workspace selection, filtering, symlink output, version races, atomic
  release preservation, closed trigger requests and serialized execution.
- Contracts: 18 tests passed. Server: 3 files, 32 tests passed, including all
  role reads, anonymous denial, strict identity DTOs and sanitized configuration
  errors. The generated OpenAPI artifact and consistency check passed.
- Node: 19 tests passed. Worker/Miniflare: 13 tests passed. Both include real
  runtime composition responses for configured and absent identity.
- Admin: identity widget and transport suites passed 27 tests; existing
  Builds/Settings suites passed 15 tests. Coverage includes role guards, empty
  history, independent retry and session recovery.
- Generator: 3 files, 20 tests passed. CLI: 22 files, 167 tests passed. An explicit
  0.6-to-0.7 upgrade checks deployment bytes, compatible-artifact instructions and
  preservation of user README/config/site; existing modified-managed-file
  conflict and recovery scenarios remain covered.
- Reference Astro fixture build and 4 files / 13 site tests passed. Root Compose
  rendering checked explicit selection, shared identity and the non-creating
  read-only bind.
- Default and Cloudflare generated snapshots passed with deterministic managed
  digests, ownership and separately checked upgrade metadata.
- Root typecheck, Oxlint, Oxfmt check, OpenAPI check, `git diff --check` and strict
  OpenSpec change validation passed. Oxlint retains four existing non-failing
  database-test warnings.

## Consumer evidence and limits

The `build-site` phase of `scripts/generated-project-acceptance.mjs` creates
disposable consumers outside the engine checkout from 12 freshly packed Lace
packages and the local API/builder images. It performs setup, publish, manual
Astro rendering and generated Compose smoke before selecting external sources.
External standalone and workspace sources contain a separate generated `cms/`
example with a different marker. Served HTML must contain the selected source's
marker and omit the example's marker. Real frozen-install failure, durable
terminal failure, source correction and administrator Retry retain the complete
old release until the successful replacement. Missing host binds and invalid
relative selection also retain served bytes. Source hashes, static output and
sanitized logs are checked against credential and private-path sentinels.
Two concurrent authenticated HTTP triggers against the real selected-source
builder both succeed; sampling scratch directories observes exactly one active
build, and the served HTML stays complete and byte-identical. Each external
source's logs are scanned before recreating its containers.

The reference mount check intentionally uses the engine workspace as source and
the already prepared consumer API; it is separate from the two independent
external consumer proofs. Full root VPS integration initially stopped at API
readiness because the existing packaged migration entrypoint through a symlink
did not migrate its new database. This unrelated root-stack startup limitation
is not counted as a passing full VPS deployment and is not changed by 29A.

Image identities, SHA-256 hashes of all 12 installed tarballs and
successful/failed/retried build IDs are recorded in
`step-29a-artifacts.json`. Images and packages were built locally, not published;
previously published alpha artifacts retain their earlier behavior. No remote
VPS or Cloudflare deployment is claimed. Publication visibility/refresh remains
the separate 29B session.
