## Why

Step 23B needs a supported operational entry point for schema migration, content synchronization, and first-admin setup across Node and Cloudflare deployments. Today those actions are scattered among repository-only development scripts, and API readiness does not establish migration currency.

## What Changes

- Add a `lace` operational CLI with named Node and Cloudflare targets, explicit remote selection, machine-readable output, stable exit codes, and redacted diagnostics.
- Connect migration, content sync/check, and setup-token minting to existing persistence and application services. Keep the Step 13 synchronization planner and guarded apply policy.
- Make API readiness depend on the installed migration version, while keeping migration an explicit deployment command.
- Cover safe non-interactive behavior and command outcomes with focused tests.

This is roadmap Step 23, Session 23B. It depends on the 23A generator and the existing Node/D1 repositories, migrations, and bootstrap services. Generated-project acceptance and package packing remain Session 23C; upgrade behavior remains Step 24.

## Capabilities

### New Capabilities

- `operational-cli`: Target selection, operator commands, output formats, exit status, and secret handling.

### Modified Capabilities

- `node-api-composition`: Readiness rejects a database whose checked-in migrations are not installed.
- `cloudflare-worker-composition`: Worker readiness rejects an out-of-date D1 schema.

## Impact

Affected areas: `packages/cli`, `packages/platform-node`, `packages/platform-cloudflare`, `apps/api`, generated project scripts, and operational tests. Relevant architecture: §§7, 8, 15, 18, 21–22; accepted specs: `configuration-synchronization`, `sqlite-schema-and-migrations`, `bootstrap-user-token-abuse-controls`, and the two composition capabilities. No REST contract or content migration policy changes.
