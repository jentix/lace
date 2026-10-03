# Step 27B verification

Verified on 2026-10-02 with Node 24.12.0 and pnpm 12.3.4 in branch
`codex/step-27-environment-checks-quickstart`.

## Delivered behavior

Fresh generation includes a root README describing installation, protected
environment preparation, setup-stage doctor, explicit migration/sync, startup,
bootstrap/setup, login/build token, Home publication, Astro and Compose builds,
data-preserving stop commands and user-owned model/route/renderer/layout work.
An installation generated in `cms/` receives the same guide there.

README is user-owned without a manifest digest. `init .` preserves an existing
allowed README byte-for-byte, including arbitrary non-UTF8 bytes, and prints an
explicit operations-guide fallback plus manual incorporation guidance. Existing
staging/publication failure recovery remains intact.

README and operations include the same placeholder-only setup curl request,
using exactly `token`, `email` and `password`. Guidance covers the configured
public base URL/path prefix, 12-character minimum, one-time bootstrap token,
expiry/completed setup and inline credential exposure. The existing private-input
script remains available. No runtime authorization or setup behavior changed.

## Checks and evidence

- `pnpm --filter create-lace test`: 3 files, 20 tests passed. Coverage includes
  fresh `cms/` generation, default/Cloudflare README preservation and manifest
  ownership, before-publication/after-backup fault injection, documentation
  command order/source paths/local links, and existing safe Astro rendering.
- The curl tests extract and execute both documented examples against a
  controlled loopback HTTP server. Both send a JSON POST to
  `/cms/api/v1/setup/admin` with precisely the three supported fields and the
  JSON content type. Fixture values are test-only, not usable installation
  credentials. This verifies transport shape, not an additional real deployment.
- `node scripts/generated-project-acceptance.mjs snapshots --update` refreshed
  default/Cloudflare contracts; the subsequent `snapshots` command passed two
  independent generations of each variant with exact managed digests, user
  ownership and no usable credentials or editable engine/admin source.
- Source ownership template advanced from 0.5.0 to 0.6.0. Reviewed snapshot
  changes are the added README inventory/tree/digest, template version and
  managed operations-guide digest. Package/image coordinates did not change.
- Root `pnpm typecheck`, `pnpm lint`, `pnpm format:check` and `git diff --check`
  passed. Generator Oxlint reports no warnings/errors; the existing four
  unrelated database-test warnings remain non-failing.
- `pnpm exec openspec validate step-27b-readme-setup-quickstart --type change --strict`
  passed before synchronization/archive.

Sandbox initially denied the curl fixture's local HTTP listen with `EPERM`.
The focused request tests and full generator suite passed when rerun with local
socket access; the failed sandbox run is not counted as acceptance.

## Release and scope limits

This is source-template work, not a publication of new packages or images.
Already published `0.1.0-alpha.1` artifacts retain their previous behavior;
consumers need a compatible artifact set containing this work. README explicitly
states that prerequisite and the current generated `site/` builder source.

Browser setup/tour, external Astro source selection, refreshed publication
visibility guidance and complete generated CMS Worker onboarding remain Steps
28–31. Pages configuration alone is not a CMS Worker deployment. Doctor's WAL
inspection limitation remains documented. No real VPS/Cloudflare deployment or
new full independent consumer journey is claimed by these documentation tests.

Planning and implementation were performed in one session at the user's explicit
request, followed by requested spec synchronization/archive and commit; the
change was apply-ready before production files were edited.
