# Step 25A verification

Verified on 2026-09-30 on `codex/step-25-local-onboarding-alpha`. This closes minimal generated-project onboarding, not the alpha artifact or stable release gates.

The generator package remains `create-lace@0.1.0`; template ownership/version is `0.3.0`. Runtime packages remain development `0.0.0`. Generated projects install through released package coordinates once Step 25B prepares them. Acceptance alone resolves the current development dependency graph to twelve local tarballs, verifies frozen reinstall and rejects source-workspace links. No registry publication was performed.

The existing compatible packaged runtime images used for this template-only change were:

| Runtime | Local image | Image ID |
| --- | --- | --- |
| API/admin | `lace23c61586945a7-api:local` | `sha256:71666edbc2d373e60ef8c0144f01665e826170d97ee5f788d358dfd80e6299fc` |
| Builder | `lace23c61586945a7-builder:local` | `sha256:ed5015ed11a2d52802b2b45d9a5ddc6d508b74247f474e436c6ce03fe6013818` |

These are local verification artifacts, not published release coordinates. MinIO was built from the unchanged pinned generated Dockerfile using Docker's build cache.

## Checks

- `pnpm --filter create-lace test`: eleven tests passed. Includes deterministic ownership and source safety, one-export sharing, failed-read retry, missing/rejected token handling, expected-version checking, generated Astro HTML for all five blocks, styling hooks, public path-prefix media, draft exclusion, unsupported-block and unsafe-rich-text rejection.
- `pnpm exec vitest run tests/generated-project-acceptance.test.mjs`: error redaction and temporary-state cleanup passed.
- Generated Compose configuration validates with an empty pre-setup build token, uses `http://api:3000/` for export transport and retains the host public origin for rendered media. A full builder still requires a real token.
- `node scripts/generated-project-acceptance.mjs all` with the image overrides above: generated default/Cloudflare snapshots, twelve packed dependencies, install/frozen offline reinstall, generated operator scripts loading `.env`, explicit migrate/sync/bootstrap, actual setup endpoint, email/password login, uploaded PNG reused by hero/image, publication, Astro build/typecheck and all five block hooks passed.
- Full Compose dispatcher/builder produced a static release, served the packaged admin, and its rendered image URLs returned the uploaded bytes from outside Docker.
- Generated Cloudflare Pages bundle/local preview and existing Worker smoke passed. Node and D1 repository/security contract suites passed.
- Root `pnpm typecheck`, `pnpm lint` (Oxlint and boundary checks), `pnpm format:check` and strict OpenSpec change/spec validation passed.

See the generated [operations guide](../packages/create-lace/templates/docs/lace-operations.md) for the complete consumer sequence and the accepted `generated-project-onboarding` capability for the behavior contract.

## Remaining boundaries

25B prepares coherent publishable prerelease package/image coordinates and an artifact procedure. 25C verifies that exact alpha graph, broader authorization and secret exclusion, service restart persistence and failed-build/retry behavior. Step 26 retains the full release gate, real Cloudflare deployment, security/resilience pass and backup/restore drill. This session does not claim registry publication, a production deployment, a first-admin browser wizard, automatic populated-model migration, or complete Cloudflare consumer onboarding.
