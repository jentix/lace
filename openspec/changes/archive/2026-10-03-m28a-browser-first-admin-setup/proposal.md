## Why

Roadmap Step 28, Session 28A makes first-admin creation usable in the browser building on delivered local preparation and diagnostics and the roadmap’s Step 27 quickstart work. Consumers currently obtain an operator-issued token but must manually call the setup API before the admin sign-in screen becomes useful.

## What Changes

- Add an anonymous, read-only `GET /api/v1/setup/state` returning only `{ setupComplete: boolean }` from durable installation state, identically on Node and Worker.
- Route anonymous admin visitors to an accessible setup screen while setup is incomplete, preserving safe return locations and showing retryable errors when the state cannot be read.
- Collect email, password, and the existing bootstrap token and submit exclusively through the existing guarded `POST /api/v1/setup/admin` endpoint. Preserve expiry, email claim/resume, request limits, password validation, and final token consumption.
- On successful setup, clear secrets and show ordinary sign-in with a completion notice. Re-read setup state after an ambiguous `404` or interrupted request; confirmed completion closes stale forms without creating another account.
- Update repository and generated-project quickstarts to prefer browser setup while retaining the exact setup API alternative.
- Verify durable state parity, setup failures/retries/concurrency, secret exclusion, and keyboard/axe/375px browser behavior.

Scope is 28A only. The introductory tour and its persistence belong to 28B. This change adds no public enrollment, token minting UI, default credentials, database schema, automatic sign-in, real-account Cloudflare deployment, or release publication.

## Capabilities

### New Capabilities

- `browser-first-admin-setup`: minimal setup-state read, accessible browser setup, guarded submission, and safe completion/recovery.

### Modified Capabilities

- `admin-application-shell`: anonymous entry and protected-route recovery select setup or sign-in using installation state; accessibility coverage includes setup.
- `generated-project-onboarding`: supported first-admin instructions prefer the browser with an operator-issued token and retain the API alternative.

## Impact

Architecture references: §§4.1, 4.8, 5–7, 14, 17, 20–22. Existing accepted behavior remains governed by `bootstrap-user-token-abuse-controls`, `authentication-and-actor-boundary`, `rest-contracts`, `admin-source-structure`, and `admin-design-system`; their security and layering requirements are unchanged.

Affected areas: `packages/application` security port; Node and D1 security adapters; shared REST contracts; portable Hono setup routes and generated OpenAPI; admin client/router and new setup entity/feature/page slices; shared security contract and runtime integration tests; browser suites; repository/generated quickstart documentation and generator inventory assertions. No new dependency or migration is expected. The change depends on delivered Step 8 security services, Steps 16–20 admin conventions, and existing consumer onboarding. Step 27 artifacts are not present on this checkout; this change updates the available operations guide and repository quickstart without implementing Step 27 doctor or generated-README features. The branch `codex/step-28-first-admin-setup` covers Step 28; 28B will receive its own just-in-time OpenSpec change.
