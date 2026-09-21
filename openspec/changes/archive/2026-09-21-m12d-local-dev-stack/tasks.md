## 1. Development topology and gateway

- [x] 1.1 Add a pinned development container asset and expand `docker-compose.dev.yml` into the six-role Node development topology (MinIO, bucket initializer, SQLite migration, API, Admin, Astro) with explicit named data/dependency volumes, health/dependency gates, bind-mounted sources, and no tracked credentials; verify `docker compose ... config` succeeds with a generated valid environment file and `up` reaches the declared healthy services.
- [x] 1.2 Add supported Admin and Astro development-server commands and make their container listeners and watch behavior reachable through the API gateway; verify their focused package checks and a running stack serves both frontend routes through the documented API origin.
- [x] 1.3 Extend the Node development gateway to preserve supported frontend upgrade connections while keeping API and health namespaces local and unavailable-upstream errors sanitized; verify focused gateway tests cover HTTP routing, namespace isolation, upgrade forwarding, failure response, and shutdown cleanup.

## 2. Safe local lifecycle

- [x] 2.1 Complete `.env.example` with every required local setting, non-secret local defaults where safe, and placeholders otherwise; verify no plaintext secret is tracked and missing/invalid values fail with only setting names in diagnostics.
- [x] 2.2 Add root `dev:node`, stop, log, explicit-reset, bootstrap, and smoke commands plus their narrowly scoped helper scripts; verify ordinary lifecycle commands preserve named development data, reset requires its explicit confirmation and targets only Lace development volumes, and bootstrap prints an expiring setup credential without persisting plaintext.
- [x] 2.3 Implement `dev:smoke` with a temporary environment and unique Compose project, bounded readiness polling, API/admin/site/MinIO assertions, and trap-based cleanup; verify a successful run leaves the persistent `lace-dev` stack and its data untouched and a failed readiness check exits non-zero after cleanup.

## 3. Documentation and roadmap

- [x] 3.1 Update the root README as the canonical developer guide for prerequisites, environment setup, first start, first-admin setup/sign-in, local URLs, normal stop/logs, explicit reset, test/quality commands, and failure recovery; verify every displayed command and URL matches the implemented scripts and Compose topology.
- [x] 3.2 Reconcile `docs/node-api.md`, authentication/migration references, and the roadmap's new Step 12.5 so they distinguish the full local stack from the future Step 13 VPS builder and contain no obsolete manual multi-process instructions; verify documentation links and command names resolve in the repository.

## 4. Verification

- [x] 4.1 Run focused Compose/script/gateway/frontend tests and the isolated `pnpm dev:smoke`, then run `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm build`, and `pnpm exec openspec validate m12d-local-dev-stack --type change --strict`; resolve every failure before marking this task complete.
