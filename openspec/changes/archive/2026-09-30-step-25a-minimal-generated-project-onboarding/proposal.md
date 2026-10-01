## Why

Step 25, session 25A closes the minimal consumer onboarding gaps before alpha artifact preparation. Generated projects currently omit block rendering, point first-admin setup at a nonexistent wizard, and give the Compose builder an internal media origin.

## What Changes

- Document a complete local consumer sequence using generated commands and packaged API/admin: install, environment, migrate, sync, bootstrap, explicit setup API request, login, build token, publication, development and static build.
- Deliver site-owned renderers for all five built-in blocks, safe rich text and stable styling hooks, deriving home/blog routes from one authenticated published export.
- Separate internal export transport from browser-facing media URLs in Compose and document synchronization limits, code-owned routes and custom renderers.
- Verify generator ownership/determinism, generated builds and URL separation; keep existing Cloudflare coverage.

## Capabilities

### New Capabilities

- `generated-project-onboarding`: local setup instructions, complete starter rendering and distinct build/media origins.

### Modified Capabilities

None. This extends the generated starter while preserving accepted `project-generator`, `operational-cli`, `public-sdk`, and `astro-reference-site` requirements.

## Impact

Primarily `packages/create-lace` templates/inventory/docs and generated-project verification. Reuse rendering behavior from `apps/site`, without importing engine checkout paths into generated projects. Architecture sections 4.2–4.8, 7, 8, 14–16 and 19–20 govern static publication, ownership, tokens and operations. Depends on completed steps 23–24 and their accepted capabilities. No database or REST changes; no content migrations, new CMS features, complete Cloudflare onboarding, release coordinates or registry publication (25B/25C and Step 26 remain separate). The user's explicit request authorizes sequential proposal, apply, spec synchronization, archive and commit in this session.
