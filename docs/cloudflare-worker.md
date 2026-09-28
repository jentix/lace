# Cloudflare Worker runtime

The Cloudflare composition runs the same portable API as the
[Node runtime](node-api.md). It uses D1 for SQL data, a native R2 binding for
media, and the Workers static-assets binding for the built admin. Everything is
wired in `@lacecms/platform-cloudflare` (`createCloudflareWorker`). The
deployable entry is [`apps/api/worker/index.ts`](../apps/api/worker/index.ts),
configured by [`apps/api/wrangler.jsonc`](../apps/api/wrangler.jsonc).

The entry statically imports the repository-root `lace.config.ts`, so the
normalized configuration is bundled into the Worker. No request can select or
evaluate a configuration module.

Local development (`pnpm dev:cloudflare`), the deploy-hook build trigger, and
D1 migration commands are delivered in Session 22C. Until the deploy hook is
available, build dispatch records the same sanitized `trigger_unavailable`
failure that an unconfigured Node deployment records.

## Bindings and variables

| Name | Kind | Required | Meaning |
| --- | --- | --- | --- |
| `DB` | D1 binding | yes | Authoritative SQL data, migrated from `packages/db/drizzle`. |
| `MEDIA` | R2 binding | yes | Private media bucket; objects are keyed `media/<id>`. |
| `ASSETS` | static assets | no | Built admin files served under `/admin/`. |
| `CACHE` | KV binding | no | Opt-in derived cache. Absent means no-op; misses and failures never change results. |
| `LACE_PUBLIC_BASE_URL` | variable | yes | Canonical absolute HTTP(S) base URL. It is the only source for public media URLs. |
| `LACE_AUTH_SECRET` | secret | yes | Better Auth and rate-limit HMAC secret. |
| `LACE_DEPLOY_HOOK_URL` | secret | no | HTTPS deploy-hook URL, validated now and used by the Session 22C trigger. |
| `LACE_ENVIRONMENT` | variable | no | `production` (default, `Secure` cookies) or `development`. |
| `LACE_R2_TIMEOUT_MS` | variable | no | Per-operation R2 timeout from 1 to 60000 ms; defaults to 10000. |

Set secrets with `wrangler secret put`, never through `vars`. When bindings or
variables are invalid, every request receives a sanitized `503` envelope. The
Worker logs only the names of the affected bindings or variables, never their
values.

## Compatibility and routing

`wrangler.jsonc` enables `nodejs_compat`, the compatibility flag Better Auth
needs for `AsyncLocalStorage`. Static assets use `run_worker_first`, so every
request reaches the Worker. Requests are handled in this order:

1. `/api/v1/*` routes
2. `/api/auth/*` routes
3. `/health/*` routes
4. `/admin/*`, which serves compiled files and falls back to `index.html` for
   extensionless client routes

Unknown `/api` paths return the API `404` envelope. They never return an admin
asset.

## Media

R2 objects are written by the native binding, without an S3 client. Each write
is capped at the 10 MiB media limit, and every call has a bounded timeout. Any
binding error surfaces as one sanitized storage failure. Uploaded images are
verified by a runtime-neutral structural inspector for JPEG, PNG, WebP, and
AVIF. The inspector rejects malformed or trailing data and reports displayed
(orientation-applied) dimensions, matching the Node sharp inspector.

## Outbox recovery

A cron trigger (`* * * * *`) runs a scheduled invocation every minute. Each
invocation claims at most one site-build event and five media-deletion events
through the shared 60-second leases and retry policy. That bound keeps one
invocation within D1's 50-query free-plan budget. Work left unfinished when a
Worker terminates is reclaimed after its lease expires.

Successful publication, entry deletion, media deletion or retry, and build
requests also register a best-effort `waitUntil` pass. The pass processes media
deletions immediately and a build after the 5-second debounce. Its failures are
logged and swallowed. The pass is never the only recovery path: the scheduled
invocation remains authoritative.

## Verification

- `pnpm --filter @lacecms/platform-cloudflare test` runs the adapters,
  including the shared repository and security contract suites, against local
  D1, R2, and KV through Miniflare. It also covers the composed Worker handlers.
- `pnpm --filter @lacecms/app-api test` bundles the Worker with a Wrangler
  dry-run, checks that the bundle contains no Node SQLite, S3, sharp, or
  filesystem module, and serves health and Better Auth routes from the bundle
  under workerd.
