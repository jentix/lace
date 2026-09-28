## Why

Roadmap Step 22 ("Cloudflare runtime"), Session 22C — Cloudflare development and
deploy hook. Sessions 22A and 22B made the Worker a complete composition over D1
and R2, but it still cannot rebuild the static site (build dispatch always
records `trigger_unavailable`), there is no way to run it locally as an
integrated product (`pnpm dev:cloudflare` is a placeholder), and D1 migrations
have no supported command (`pnpm db:migrate:cloudflare` is a placeholder that
fails). Architecture §5 (build trigger), §15 (Cloudflare deploy hook as the
Cloudflare `SiteBuildTrigger`), §18 (`dev:cloudflare` and
`db:migrate:cloudflare`), and §9.7 (explicit migration step) require these
before the Step 22 acceptance criteria can be met.

## What Changes

- Add a `DeployHookSiteBuildTrigger` in `@lacecms/platform-cloudflare` that POSTs
  to the configured deploy-hook URL secret with a bounded timeout, no redirects,
  no request-controlled data, and a bounded response read. A 2xx response with a
  valid Cloudflare provider deployment ID records an accepted (running) build
  with that ID; a 2xx response without one records dispatch success; throttling,
  server errors, network failures, and timeouts are retryable
  `trigger_unavailable` failures; other responses and explicit provider
  rejections are `provider_failed`. The URL never appears in logs, errors, or
  build records.
- Add an optional `LACE_DEPLOY_HOOK_TIMEOUT_MS` Worker variable (1–60000 ms,
  default 10000). The Worker uses the deploy-hook trigger whenever
  `LACE_DEPLOY_HOOK_URL` is configured and keeps the `trigger_unavailable`
  fallback otherwise.
- Replace the `dev:cloudflare` placeholder with a local integration workflow:
  build the Worker's workspace dependencies, apply local D1 migrations into a
  persisted state directory under the ignored `dev-data/cloudflare/`, synchronize
  the project configuration into local D1, print a one-time first-admin setup
  token while setup is open, then start `wrangler dev` (local-only bindings,
  persisted D1/R2 state, test-scheduled endpoint), the admin Vite server, and the
  Astro dev server behind one same-origin gateway (`/api`, `/health` → Worker;
  `/admin` → admin; everything else → site). The local auth secret is generated
  once into an ignored `0600` variables file. An opt-in `--kv` flag adds a local
  KV cache binding.
- Replace the `db:migrate:cloudflare` placeholder with a command that requires
  exactly one explicit target, `--local` or `--remote`. Local applies the
  checked-in migrations to the same persisted state as `dev:cloudflare`. Remote
  refuses the placeholder database ID, and outside CI requires the operator to
  type the D1 database name interactively; a non-interactive shell outside CI is
  refused.
- Add Worker smoke tests that run the Wrangler-built bundle under workerd with
  D1 migrated by the new local migration command, R2, static admin assets, and an
  intercepted deploy hook, covering health, setup and sign-in, upload to R2,
  publish, scheduled dispatch through the deploy hook, authenticated build
  export, and static admin fallback.
- Document the local workflow, deploy hook, and migration commands in
  `docs/cloudflare-worker.md`.

Non-goals: polling a provider for the terminal result of an accepted build
(accepted builds stay `running` with their provider ID until a later
provider-status integration), remote `wrangler dev`, content sync or bootstrap
commands against remote D1 (Session 23B), a generated-project Cloudflare
template (Session 23A/23C), and CI deployment workflows.

Dependencies: Sessions 22A (D1 repositories) and 22B (Worker composition,
settings, scheduled recovery), and the Step 21 `SiteBuildTrigger` port and
build lifecycle.

## Capabilities

### New Capabilities
- `cloudflare-deploy-hook-trigger`: the Cloudflare `SiteBuildTrigger` that calls a
  deploy hook held in a Worker secret, with timeouts, provider-ID capture, and
  sanitized failure mapping.
- `cloudflare-local-development`: the `dev:cloudflare` integration workflow, the
  local/remote D1 migration command, and the Worker bundle smoke suite.

### Modified Capabilities
- `cloudflare-worker-composition`: settings accept the optional deploy-hook
  timeout, and build dispatch uses the deploy-hook trigger whenever a deploy-hook
  URL is configured.

## Impact

- `packages/platform-cloudflare`: new `deploy-hook.ts`, settings and worker
  composition changes, tests.
- `apps/api`: new `cloudflare-local.ts` Node helper (local sync and setup token
  against persisted local D1), a shared Wrangler bundle test harness, and a new
  Worker smoke test.
- `scripts/cloudflare.mjs` (+ testable helper module) and root `package.json`
  scripts `dev:cloudflare` and `db:migrate:cloudflare`; root tests for argument
  parsing, confirmation, and gateway routing.
- `docs/cloudflare-worker.md`, `docs/mvp-implementation-roadmap.md` note.
- No REST contract, database schema, or dependency changes; Wrangler and
  Miniflare are already pinned.
