## Context

See proposal.md — Why. Current state after 22B:

- `createCloudflareRuntime` accepts an optional `buildTrigger` factory and
  otherwise uses `UnavailableSiteBuildTrigger`. `parseCloudflareSettings`
  already validates `LACE_DEPLOY_HOOK_URL` as an HTTPS URL without userinfo or
  fragment, and never echoes values.
- The shared `SiteBuildDispatcher` maps `accepted` → running + provider ID
  (`recordSiteBuildAccepted`, ID ≤ 200 chars), `succeeded` → succeeded, and
  sanitizes failure reasons to `trigger_unavailable`, `build_timeout`, or
  `provider_failed`. It renews the lease every 20 s during a trigger call.
- `wrangler.jsonc` points D1 migrations at `packages/db/drizzle`; Wrangler's
  `d1 migrations apply` accepts those Drizzle files as-is (verified). Wrangler
  local state for `--persist-to <dir>` lives in `<dir>/v3`; standalone Miniflare
  opens the same data with `resourcePersistencePath: <dir>/v3` and the same D1
  database ID (verified).
- The Node dev gateway lives in `apps/api/src/node-server.ts` and is bound to the
  Node runtime; `dev:node` runs in Docker Compose.
- `apps/api/src/worker-bundle.test.mjs` already builds the Worker with
  `wrangler deploy --dry-run` into a temporary directory and runs it with
  Miniflare.

## Goals / Non-Goals

**Goals:** keep all new runtime code inside `@lacecms/platform-cloudflare`
(trigger) and development tooling inside `scripts/` and `apps/api` (Node-only
helpers that never enter the Worker bundle); make every destructive or remote
operation explicit.

**Non-Goals:** a Docker-based Cloudflare dev stack, remote bindings in dev,
provider-status polling, and generalizing the Node dev gateway.

## Decisions

### 1. Deploy-hook trigger semantics

`DeployHookSiteBuildTrigger` (platform-cloudflare) takes `{ url, timeoutMs,
fetch? }`. It sends `POST` with `redirect: "manual"`, `accept:
application/json`, no body, and `AbortSignal.timeout(timeoutMs)`. The response
body is read through the stream up to 16 KiB and then cancelled.

Mapping (see the deploy-hook spec): 2xx + valid `result.id` → `accepted`; 2xx
otherwise → `succeeded`; 2xx `success: false` → `provider_failed`; 408/425/429/
5xx, thrown errors, and aborts → `trigger_unavailable`; other statuses
(including 3xx from manual redirect, which the Workers runtime returns as the
redirect response) → `provider_failed`.

- Why `accepted` with an ID: the Step 21 lifecycle already models asynchronous
  providers and the roadmap asks for provider-ID capture. Cloudflare Pages and
  Workers Builds deploy hooks return the Cloudflare envelope
  `{ success, errors, messages, result: { id, ... } }`.
- Why `succeeded` without an ID: a generic hook gives Lace no handle to track,
  so the only observable fact is that the provider accepted the request.
  Recording it as running forever would block nothing but mislead operators.
- Rejected: marking every 2xx as succeeded (loses the provider ID), and polling
  the Cloudflare API for deployment status (needs an account API token and is
  out of scope; the running build keeps its ID for a later integration).
- Timeouts map to `trigger_unavailable`, not `build_timeout`: the hook call, not
  the build, timed out.
- Default timeout 10 s, configurable via `LACE_DEPLOY_HOOK_TIMEOUT_MS`
  (1–60000). Even the maximum stays well inside the 60 s lease that the
  dispatcher renews every 20 s.

The Worker composition picks the trigger:
`input.buildTrigger?.(settings) ?? (settings.deployHookUrl ? new
DeployHookSiteBuildTrigger(...) : new UnavailableSiteBuildTrigger())`.

### 2. `pnpm dev:cloudflare` orchestration

A single Node script `scripts/cloudflare.mjs` with subcommands `dev` and
`migrate`; pure logic (argument parsing, gateway routing, dev config generation,
confirmation) lives in `scripts/cloudflare-lib.mjs` so root tests cover it
without spawning processes.

`dev` steps:
1. `pnpm turbo run build --filter=@lacecms/app-api...` so the Worker's workspace
   imports (package `exports` → `dist`) and `apps/api/dist/cloudflare-local.js`
   exist.
2. Ensure `dev-data/cloudflare/` (mode 0700) and `.dev.vars` (mode 0600) with a
   generated `LACE_AUTH_SECRET`; reuse it when present.
3. Write `dev-data/cloudflare/wrangler.dev.json` from `apps/api/wrangler.jsonc`
   with absolute `main`/`migrations_dir`, no `assets` (the gateway sends
   `/admin` to Vite, and the optional binding keeps the Worker valid), `vars`
   `LACE_PUBLIC_BASE_URL=http://127.0.0.1:8787/` and
   `LACE_ENVIRONMENT=development`, and a local `CACHE` KV namespace only with
   `--kv`. The checked-in production config is never modified.
4. Apply local migrations (same function as `migrate --local`).
5. Run `node apps/api/dist/cloudflare-local.js prepare --persist-to <state>`:
   opens the persisted D1 through Miniflare (`resourcePersistencePath`),
   runs the existing `runLocalContentSync` (platform-node's generic sync
   runner) against `D1ContentRepository`, and calls
   `D1SecurityService.createSetupToken()`; "Setup already completed." is
   reported as "setup complete" instead of a token. Miniflare is disposed
   before Wrangler starts, so only one workerd process opens the SQLite files.
6. Spawn `wrangler dev --config <generated> --persist-to <state> --env-file
   <.dev.vars> --ip 127.0.0.1 --port 8788 --local --test-scheduled
   --local-upstream 127.0.0.1:8787 --show-interactive-dev-session=false`,
   admin `vite --host 127.0.0.1 --port 5173 --strictPort`, and site `astro dev
   --host 127.0.0.1 --port 4321` with `LACE_API_BASE_URL` and
   `LACE_PUBLIC_BASE_URL` set to the gateway origin (fixture data mode unless
   the operator sets live mode).
7. Start the gateway on `127.0.0.1:8787` and wait for `/health/ready`.

Gateway: a `node:http` reverse proxy. `routeFor(pathname)` returns `worker`
for `/api`, `/api/*`, `/health`, `/health/*`, and `/__scheduled` (Wrangler's
test-scheduled endpoint), `admin` for `/admin`, `/admin/*`, and everything else
`site`. It strips `forwarded`/`x-forwarded-*` headers, forwards `Host` as the
gateway host (Vite and Astro allow loopback IP hosts; `--local-upstream` makes
the Worker see the gateway origin in `request.url`), streams bodies, and pipes
WebSocket upgrades for admin and site only. Upstream failure returns a JSON
`502`. Ctrl-C/SIGTERM stops the gateway and all children.

- Rejected: reusing `apps/api/src/node-server.ts` (bound to Node runtime
  settings), Vite's own proxy (would leave the site on another origin), and
  Docker Compose (Wrangler/workerd dev is fastest natively and the state
  directory must be host-visible for the migration command).

### 3. Migration command

`migrate` requires exactly one of `--local` or `--remote` (leading `--` from
pnpm ignored). `--persist-to <dir>` is allowed only with `--local` and defaults
to `dev-data/cloudflare/state`; tests use it for isolation. Local runs
`wrangler d1 migrations apply DB --local --persist-to <dir> --config
apps/api/wrangler.jsonc`. Remote reads the D1 entry from the checked-in config,
refuses the all-zero placeholder ID, and, when `CI` is unset or `false`,
requires a TTY and an exact typed database name; then runs `... --remote`.
Wrangler is always run with `CI=true` so its own prompt does not duplicate
ours, and `WRANGLER_SEND_METRICS=false`.

### 4. Smoke tests

Extract the dry-run bundling from `worker-bundle.test.mjs` into
`apps/api/src/worker-bundle-harness.mjs` (bundle once per test file). The new
`worker-smoke.test.mjs`:
- applies migrations with `node scripts/cloudflare.mjs migrate --local
  --persist-to <tmp>` and opens Miniflare on that state with the bundle,
  `ASSETS` (temporary `index.html` + one script), `MEDIA`, and an
  `outboundService` that records deploy-hook requests and answers with a
  Cloudflare envelope;
- syncs configuration and mints a setup token through the Node helper module;
- drives setup, sign-in, PNG upload (verified in R2), entry creation and
  publication, a build token, a scheduled invocation after the 5 s debounce,
  build history, build export, and `/admin/...` fallback.

Because the bundle also registers a best-effort `waitUntil` pass, the test
asserts the durable outcome (one hook call, build running with provider ID)
rather than which pass delivered it.

## Risks / Trade-offs

- [Accepted deploy-hook builds stay `running`] → documented; the provider ID is
  recorded for the provider dashboard and a later status integration.
- [Two workerd processes on one SQLite state] → the prepare helper disposes
  Miniflare before Wrangler starts; the migration command documents stopping
  `dev:cloudflare` first.
- [Wrangler flag drift] → Wrangler is catalog-pinned; the smoke test exercises
  the same migration command and bundle path.
- [Fixed dev ports] → `--strictPort`-style failures name the busy port; ports
  can be made configurable later without changing specs.
- [Hook URL is itself the credential] → only accepted as a secret; the
  composition never logs it, and the trigger's failures carry fixed reasons.

## Migration Plan

No schema or contract change. Operators set `LACE_DEPLOY_HOOK_URL` with
`wrangler secret put`, optionally `LACE_DEPLOY_HOOK_TIMEOUT_MS` in `vars`, and
run `pnpm db:migrate:cloudflare -- --remote` before deploying. Rollback is
removing the secret, which restores the `trigger_unavailable` behavior.
