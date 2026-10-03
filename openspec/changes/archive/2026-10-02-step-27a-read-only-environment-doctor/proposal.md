## Why

Step 27, session **27A — Read-only environment doctor**, follows completed Step 26. Operators currently discover missing tools, settings and migrations by running individual commands; there is no bounded report that distinguishes unfinished setup from a broken running installation.

## What Changes

- Add `lace doctor --target node|cloudflare-local|cloudflare-remote --stage setup|ready [--mode native|compose] [--json]`. Target and stage are mandatory; mode defaults to native for Node and is invalid for Cloudflare.
- Inspect project-declared Node/pnpm compatibility, selected target settings, migration state, API readiness and build-token presence. Inspect Docker Compose and daemon availability only in Node Compose mode; inspect project-local Wrangler and the selected DB binding only for Cloudflare.
- Report ordered checks with safe explanations and recovery actions; distinguish pass, expected unfinished setup, failed prerequisite and dependent skipped checks. Document aggregate exit semantics.
- Keep diagnosis bounded and read-only. Node opens an existing SQLite database read-only; remote D1 runs only a bounded ledger SELECT; local D1 uses the existing running Worker's readiness as migration evidence without starting Miniflare or creating state.
- Document doctor in the CLI guide and existing generated operations guide, and verify it using independent packed consumers. Do not add generated README or quickstart work from 27B.

## Capabilities

### New Capabilities

- `environment-doctor`: explicit stage/target diagnostic selection, compatibility and prerequisite checks, migration/readiness evidence, deterministic redacted reports and bounded read-only execution.

### Modified Capabilities

None. Existing operational commands and their default targets, diagnostics and exit codes retain their accepted behavior.

## Impact

Architecture §§4.8, 6–7, 18–22 and accepted `operational-cli`, `generated-project-onboarding`, `node-api-composition`, `cloudflare-worker-composition` and `cloudflare-local-development` govern this addition. The existing API readiness contract already checks the complete packaged migration ledger on both runtimes. The generated Cloudflare template currently contains Pages configuration only; doctor must report missing CMS DB bindings rather than claim complete Worker onboarding (Step 31).

Implementation belongs to `packages/cli` (parser, dispatch, pure report policy and narrowly injected read-only probes). Documentation touches `packages/cli/README.md` and `packages/create-lace/templates/docs/lace-operations.md`; any managed template-byte change requires the generator's version/snapshots and ownership metadata to remain coherent. Existing release/consumer harnesses provide packed-package isolation. No product endpoint, database migration or production dependency is required except a narrowly justified range parser if existing dependencies cannot cover declared semver ranges.

Non-goals: migrate/sync/bootstrap, secret creation or validation via privileged content requests, service startup, package installation, arbitrary configuration evaluation, object-storage writes, build triggering, first-admin UI, template root README, account provisioning and full generated Cloudflare CMS onboarding. The report proves prerequisite/readiness observations, not successful publication or deployment.
