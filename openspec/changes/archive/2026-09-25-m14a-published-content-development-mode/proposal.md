## Why

Step 14, Session 14A connects the local Astro site to content published through the admin. Today the local Compose stack starts Astro in fixture mode, so publishing cannot change the site a contributor sees at the same-origin development URL.

## What Changes

- Start the local Astro development server in live published-export mode, using a read-only build token and the existing SDK. Keep the token in the server process and keep fixture mode for isolated builds and tests.
- Repair the local first-admin bootstrap command's package resolution so a fresh filtered-install stack can issue the credential needed for this workflow.
- Document creation of a build token through the existing admin API until Step 15B adds Settings controls. Document the refresh or restart step needed to observe a publication and clarify that draft saves do not affect the public site.
- Make absent or invalid tokens, API unavailability, and an export without a published home entry produce actionable local diagnostics.
- Preserve the static-build architecture: no draft endpoint, browser token, new API route, automated build dispatch, or additional code-owned route belongs to 14A. Session 14B covers additional routes and end-to-end content proof.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `local-node-development`: The local stack starts Astro against the local published API with a server-side build token and documents credential setup and publication refresh.
- `astro-reference-site`: Live development reports actionable errors for credential, transport, and missing-home failures while fixture builds remain deterministic.

## Impact

The local Compose site service, site data loader, development commands and guides, and focused Astro/stack tests are affected. The existing build-export endpoint, build-token administration API, SDK, and static route code remain the integration points. This follows architecture sections 4.2, 4.4, 4.7, 5, and 6 and extends the accepted `local-node-development`, `astro-reference-site`, `public-sdk`, and `bootstrap-user-token-abuse-controls` behavior without changing the SDK or token permissions.
