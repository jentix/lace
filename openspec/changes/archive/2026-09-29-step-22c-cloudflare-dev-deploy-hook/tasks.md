## 1. Deploy-hook trigger

- [x] 1.1 Implement `DeployHookSiteBuildTrigger` in `@lacecms/platform-cloudflare` (bodiless `POST`, manual redirects, bounded timeout, 16 KiB bounded read, Cloudflare envelope ID capture, status mapping); verify unit tests for accepted-with-ID, success-without-ID, `success: false`, redirect, 404, 408/429/503, network error, timeout, oversized body, and invalid IDs, and that no result or log contains the hook URL.
- [x] 1.2 Add `LACE_DEPLOY_HOOK_TIMEOUT_MS` (1–60000, default 10000) to `parseCloudflareSettings` and select the deploy-hook trigger in the Worker composition when a URL is configured; verify settings tests for defaults and out-of-range values and a Worker test where a scheduled dispatch calls an intercepted hook and records the provider ID.

## 2. Local Cloudflare tooling

- [x] 2.1 Add `scripts/cloudflare-lib.mjs` with migration argument parsing, remote confirmation rules, development Wrangler config generation, and gateway routing; verify root tests for missing/duplicate/unknown targets, `--persist-to` restrictions, placeholder refusal, CI and non-TTY behavior, generated config contents, and route selection.
- [x] 2.2 Add `apps/api/src/cloudflare-local.ts` (`prepare --persist-to <dir>`: sync configuration into persisted local D1 and mint a setup token while setup is open); verify by running it twice against a migrated temporary state that the second run reports setup still open only until bootstrap and that sync reports no changes.
- [x] 2.3 Implement `scripts/cloudflare.mjs migrate` and point `db:migrate:cloudflare` at it; verify `pnpm db:migrate:cloudflare -- --local --persist-to <tmp>` applies all migrations and that no-target and `--remote` with the placeholder ID exit non-zero without running Wrangler.
- [x] 2.4 Implement `scripts/cloudflare.mjs dev` (build, secrets file, generated config, local migrate, prepare, Wrangler, admin, site, gateway, signal cleanup) and point `dev:cloudflare` at it; verify manually that `/health/ready`, `/admin/`, `/`, and `/api/v1/unknown` answer through `http://127.0.0.1:8787` and that state persists across a restart.

## 3. Smoke tests

- [x] 3.1 Extract the Wrangler dry-run bundling into `apps/api/src/worker-bundle-harness.mjs` and keep `worker-bundle.test.mjs` passing on it.
- [x] 3.2 Add `apps/api/src/worker-smoke.test.mjs` covering health, setup and sign-in, upload stored in R2, publish, scheduled dispatch to an intercepted deploy hook with provider ID, authenticated build export, and static admin fallback against the bundle and local migration command; verify it passes.

## 4. Documentation and verification

- [x] 4.1 Update `docs/cloudflare-worker.md` (deploy hook, timeout variable, `dev:cloudflare`, migrations, smoke tests) and note 22C completion in the roadmap; verify links resolve.
- [x] 4.2 Run focused package tests, root tests, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm exec openspec validate step-22c-cloudflare-dev-deploy-hook --type change --strict`; verify all pass.
