## Why

Step 15, Session 15C closes the local browser-admin milestone. The existing focused tests and infrastructure smoke check do not yet prove that a fresh operator can complete the entire editorial flow through Admin and see the published result on the local Astro site; the README still instructs token creation through a browser-console API call despite the completed Settings screen.

## What Changes

- Add a repeatable local product acceptance walkthrough and focused browser verification covering configuration sync, page and collection editing, media upload and reuse, publication, and the published Astro routes.
- Exercise admin, editor, and viewer permissions; draft/published isolation; revision-conflict recovery; responsive and keyboard navigation; and loading, empty, and error states on Content, Media, Users, and Settings.
- Update operator guidance to use the functional Settings token flow and document the intentional Builds state until Step 16.
- Fix concrete gaps found by that pass within Session 15C's existing behavior contracts; revise this change's artifacts first if a fix requires a new product behavior.

## Capabilities

### New Capabilities

- `local-product-acceptance`: A repeatable, evidence-backed local browser walkthrough and acceptance criteria for the complete Step 15 editorial experience.

### Modified Capabilities

- `local-node-development`: The documented local published-site setup uses Admin Settings to issue the read-only build token, so an administrator need not call the content or token API by hand.

## Impact

This change targets the Node/SQLite/MinIO development stack, Admin and Astro browser flows, acceptance tests, and local documentation. It builds on the accepted `local-node-development`, `admin-application-shell`, `admin-draft-editor`, `admin-media-library`, `admin-users-and-settings`, and `astro-reference-site` specifications. It preserves the architecture's single-site, code-first, explicit-sync, published-snapshot, and static-site boundaries (architecture §§4, 7–8 and the local development and publication sections). Automated builds, VPS/Cloudflare deployment, generated projects, and new editorial features remain in later roadmap units.
