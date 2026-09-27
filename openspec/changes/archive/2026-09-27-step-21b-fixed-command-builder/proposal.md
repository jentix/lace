## Why

Step 21A durably records site-build work, but the Node trigger has no production builder to execute it. Step 21B supplies the fixed-command VPS boundary required by architecture sections 5 and 13 and ADR 0004, before Step 21C wires deployment and UI.

## What Changes

- Add a private authenticated builder endpoint accepting only build ID and target published-state version.
- Copy the mounted reference project to isolated work space, install with a frozen lockfile using a pinned image toolchain, build Astro, and publish a release only on success.
- Retain the current and previous successful releases and return bounded, sanitized results to the Node dispatch trigger.
- Renew the existing 60-second dispatch lease during a long synchronous builder call.
- Add focused security, failure, and release-switch tests and operator-facing contract documentation.

## Capabilities

### New Capabilities

- `fixed-command-vps-builder`: Private build request, fixed execution, release publication, and sanitized response behavior.

### Modified Capabilities

- `site-build-dispatch`: Node/VPS trigger uses the private builder's synchronous outcome.

## Impact

`apps/builder`, `packages/platform-node`, the reference Astro site, a builder image and tests. No new database migration or public REST endpoint. Step 21C remains responsible for production Compose wiring, recovery service, reverse proxy, and build UI. The generated project from Step 23 must later satisfy the same source contract. Cloudflare's build trigger remains a separate adapter.
