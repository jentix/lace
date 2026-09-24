# Node API runtime

The Node composition uses SQLite, Better Auth, and a private MinIO bucket. It
checks that the configured bucket exists before binding the listener.

## Prerequisites

For the supported full local browser stack, follow the root
[README](../README.md). `pnpm dev:node` owns the Compose lifecycle: it applies
already-committed migrations before the API becomes ready and does not run
configuration synchronization. Synchronization remains an intentional operator
operation, not a readiness side effect.

## Environment

| Variable | Required | Meaning |
| --- | --- | --- |
| `LACE_DATABASE_PATH` | yes | Non-empty SQLite database path. |
| `LACE_PUBLIC_BASE_URL` | yes | Canonical absolute HTTP(S) base URL, with no credentials, query, or fragment. It is the only source for public media URLs. |
| `LACE_AUTH_SECRET` | yes | Better Auth secret; startup diagnostics never include its value. |
| `LACE_MINIO_ENDPOINT` | yes | Absolute HTTP(S) MinIO endpoint with no credentials, query, fragment, or path. |
| `LACE_MINIO_BUCKET` | yes | Existing private bucket for verified media objects. |
| `LACE_MINIO_REGION` | yes | S3-compatible region identifier. |
| `LACE_MINIO_ACCESS_KEY` | yes | MinIO/S3 access key; never logged. |
| `LACE_MINIO_SECRET_KEY` | yes | MinIO/S3 secret key; never logged. |
| `LACE_MINIO_TIMEOUT_MS` | yes | Positive per-operation timeout, capped at 60 seconds. |
| `LACE_HOST` | no | Listener host; defaults to `127.0.0.1`. |
| `LACE_PORT` | no | Listener port from `1` to `65535`; defaults to `3000`. |
| `LACE_ADMIN_DEV_ORIGIN` | no | Absolute origin for the Admin development server. The Docker topology uses `http://admin:5173`. |
| `LACE_SITE_DEV_ORIGIN` | no | Absolute origin for the Astro development server. The Docker topology uses `http://site:4321`. |

Startup errors identify invalid variable names, never their values. The runtime
does not derive public URLs from `Host`, `Forwarded`, or `X-Forwarded-*`
headers.

## Local development

`pnpm dev:node` starts all six development roles: private MinIO, its bucket
initializer, a migration job, the Node gateway, Admin Vite, and Astro. It is
the only supported local start command; do not manually start an API process,
frontend process, or MinIO service alongside it.

The browser uses `http://127.0.0.1:3000` by default. `/api/*` and `/health/*`
stay local to Node; `/admin/*` reaches Vite and all other frontend paths reach
Astro through the same origin. Upgrade connections used by the frontend
development servers are forwarded to their selected upstream. If a frontend
upstream is unavailable, the gateway returns a sanitized `502` response.

The full local environment list is in [`.env.example`](../.env.example); use
`pnpm dev:env` rather than placing credentials in shell history. MinIO remains
inside the Compose network, and its persistent data is preserved unless the
explicit root reset is requested.

## Editing content models

The repository-root [`lace.config.ts`](../lace.config.ts) is the editable source
of content structure. Its `definePage` and `defineCollection` calls use the
typed `@lacecms/config` API; `field` and `builtInBlocks` come from
`@lacecms/content`. The examples define the singleton `home` page at `/` and
the `posts` collection at `/blog/:slug`. A new page needs a stable lowercase
kebab-case `key`, positive integer `version`, fixed canonical `path`, and any
fields or allowed blocks. A collection uses a canonical `route` with exactly
one `:slug` segment instead of `path`. All allowed block keys must be listed
in the config's registered block definitions.

Choose the site presentation alongside the model definition. The current
`home` route is [`apps/site/src/pages/index.astro`](../apps/site/src/pages/index.astro)
and `posts` uses
[`apps/site/src/pages/blog/[slug].astro`](../apps/site/src/pages/blog/[slug].astro).
For a page at `/about`, add `apps/site/src/pages/about.astro`; for a collection
at `/news/:slug`, add `apps/site/src/pages/news/[slug].astro` with
`getStaticPaths()`. The existing routes use
[`BlockRenderer.astro`](../apps/site/src/components/BlockRenderer.astro) to
render ordered blocks. Lace validates route definitions; it does not create
Astro files or choose a layout. The reference site currently reads a fixture;
Step 14 connects it to locally published content.

Keep a model key stable once it has stored content. Increase `version` when a
field, allowed block, path, route, or other structural definition changes; a
structural change with stored snapshots can still be rejected by the sync
planner. To deliberately rename a key, set `renamedFrom` to its old key while
introducing the new key and increased version. The hint is temporary and
requires the former stored key to exist; Lace never infers a rename from a
removal and addition. A changed route alone does not rename a model.

After editing the config, restart the development API through the supported
stack lifecycle:

```sh
pnpm dev:stop
pnpm dev:node
```

The API imports and normalizes the file once before listening. A missing,
unloadable, or invalid file fails startup. Neither a browser request nor an
environment value selects a different TypeScript file. Restarting and running
SQLite migrations do not synchronize models or create page drafts. Session
13B adds the explicit local `content:sync` operation; until it is available,
new or changed models cannot be assumed to appear in the admin. Collection
entries remain CMS-managed after sync.

`GET /health/live` only confirms that the HTTP process is serving. `GET
/health/ready` performs one local SQLite `SELECT 1`; bucket reachability is
checked once before startup, not on every readiness request.

## Recoverable media deletion

`DELETE /api/v1/admin/media/:mediaId` only marks an unreferenced active item as
`deleting` and returns `202 Accepted`. After the MinIO startup preflight, the
Node process runs one non-overlapping background pass per second for
`media.delete.requested` work. Each claim has a 60-second lease; a restart or
crash leaves unfinished work available for recovery after that lease expires.

Storage failures retry at most eight times with full-jitter exponential backoff
(one-second base, fifteen-minute cap). The final failure leaves metadata in
`delete_failed` with an internal sanitized diagnostic; it never exposes bucket
details, storage keys, credentials, or raw SDK errors in media JSON. An actor
with `media:write` can request a fresh asynchronous attempt with:

```text
POST /api/v1/admin/media/:mediaId/retry-deletion
```

The retry is accepted only for an unreferenced `delete_failed` item. It clears
the prior internal diagnostic, returns `202 Accepted`, and never performs object
deletion in the HTTP request. A successful or already-absent object deletion is
followed by an atomic removal of its still-unreferenced `deleting` metadata.

## Current boundaries

The cache always misses and the build trigger reports unavailable. The Node
runtime streams verified MinIO media through authenticated previews and stable
published-media URLs; external build dispatch remains later work. The test actor is a Vitest-only adapter and is never enabled
by a request header, query string, or production environment variable.
