## Why

Roadmap Step 26, session 26C (Environment preparation), removes manual copying and secret generation from fresh local onboarding. Steps 26A and 26B already provide reliable migrations and sanitized recovery diagnostics.

## What Changes

- Add `lace env prepare [--json]`, run from the project root without loading `.env` or database/runtime adapters, and generated `pnpm env:prepare`.
- Preserve `.env.example` settings while replacing four service credentials with cryptographically random service-compatible values and leaving `LACE_BUILD_TOKEN` empty.
- Publish a complete owner-only `.env` atomically without overwriting any existing entry, including concurrent creation; sanitize all command output.
- Document the sequence and verify installed packed consumers plus filesystem failure/concurrency behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `operational-cli`: explicit safe local environment preparation and recovery diagnostics.
- `generated-project-onboarding`: generated script and documented preparation before migrations.

## Impact

Architecture sections 4.8, 7 and the security/operational boundaries govern this change. Accepted `operational-cli`, `generated-project-onboarding` and `project-generator` behavior remains authoritative. Implementation belongs to `packages/cli`, `packages/create-lace` templates, generated snapshots and package acceptance tooling. No new dependencies, SQL migrations, remote provisioning, doctor, browser setup, secret rotation, package publication or API startup mutations. This source change retains alpha artifact/template versions; the coherent next-version artifact refresh remains Step 32B.
