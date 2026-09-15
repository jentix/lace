# Node API runtime

Session 7C provides the SQLite-backed Node composition and the local development
gateway. It is an unauthenticated pre-Step-8 vertical slice: production actor
resolution denies all protected routes until Better Auth is composed.

## Prerequisites

Run the forward migrations before starting a server:

```sh
LACE_DATABASE_PATH=./lace.sqlite pnpm db:migrate:node
```

Then synchronize the normalized configuration against that database before
creating or reading content. Configuration synchronization is intentionally an
explicit operator action; readiness does not run migrations or synchronize
configuration.

## Environment

| Variable | Required | Meaning |
| --- | --- | --- |
| `LACE_DATABASE_PATH` | yes | Non-empty SQLite database path. |
| `LACE_PUBLIC_BASE_URL` | yes | Canonical absolute HTTP(S) base URL, with no credentials, query, or fragment. It is the only source for public media URLs. |
| `LACE_HOST` | no | Listener host; defaults to `127.0.0.1`. |
| `LACE_PORT` | no | Listener port from `1` to `65535`; defaults to `3000`. |
| `LACE_ADMIN_DEV_ORIGIN` | no | Absolute origin for the already-running admin development server. |
| `LACE_SITE_DEV_ORIGIN` | no | Absolute origin for the already-running site development server. |

Startup errors identify invalid variable names, never their values. The runtime
does not derive public URLs from `Host`, `Forwarded`, or `X-Forwarded-*`
headers.

## Local development

```sh
LACE_DATABASE_PATH=./lace.sqlite \
LACE_PUBLIC_BASE_URL=http://127.0.0.1:3000/ \
LACE_ADMIN_DEV_ORIGIN=http://127.0.0.1:5173 \
LACE_SITE_DEV_ORIGIN=http://127.0.0.1:4321 \
pnpm dev:node
```

The command starts the Node API listener. `/api/*`, `/health/live`, and
`/health/ready` stay local; `/admin/*` is proxied to the configured admin
origin and all other frontend paths go to the site origin. The command does not
start frontend processes: current admin/site packages have no development
servers yet.

`GET /health/live` only confirms that the HTTP process is serving. `GET
/health/ready` performs one local SQLite `SELECT 1`; it does not contact object
storage, a build trigger, cache, or frontend upstream.

## Current boundaries

The cache always misses, object storage fails closed, and the build trigger
reports unavailable. There is no MinIO, external build dispatch, real media
serving, configuration-module loader, or production authentication in this
session. The test actor is a Vitest-only adapter and is never enabled by a
request header, query string, or production environment variable.
