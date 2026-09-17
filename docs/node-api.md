# Node API runtime

The Node composition uses SQLite, Better Auth, and a private MinIO bucket. It
checks that the configured bucket exists before binding the listener.

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
| `LACE_AUTH_SECRET` | yes | Better Auth secret; startup diagnostics never include its value. |
| `LACE_MINIO_ENDPOINT` | yes | Absolute HTTP(S) MinIO endpoint with no credentials, query, fragment, or path. |
| `LACE_MINIO_BUCKET` | yes | Existing private bucket for verified media objects. |
| `LACE_MINIO_REGION` | yes | S3-compatible region identifier. |
| `LACE_MINIO_ACCESS_KEY` | yes | MinIO/S3 access key; never logged. |
| `LACE_MINIO_SECRET_KEY` | yes | MinIO/S3 secret key; never logged. |
| `LACE_MINIO_TIMEOUT_MS` | yes | Positive per-operation timeout, capped at 60 seconds. |
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
LACE_AUTH_SECRET=replace-with-a-local-secret \
LACE_PUBLIC_BASE_URL=http://127.0.0.1:3000/ \
LACE_MINIO_ENDPOINT=http://127.0.0.1:9000 \
LACE_MINIO_BUCKET=lace-media \
LACE_MINIO_REGION=us-east-1 \
LACE_MINIO_ACCESS_KEY=local-access-key \
LACE_MINIO_SECRET_KEY=local-secret-key \
LACE_MINIO_TIMEOUT_MS=5000 \
LACE_ADMIN_DEV_ORIGIN=http://127.0.0.1:5173 \
LACE_SITE_DEV_ORIGIN=http://127.0.0.1:4321 \
pnpm dev:node
```

The command starts the Node API listener. `/api/*`, `/health/live`, and
`/health/ready` stay local; `/admin/*` is proxied to the configured admin
origin and all other frontend paths go to the site origin. The command does not
start frontend processes: current admin/site packages have no development
servers yet.

Start the development bucket and its idempotent initializer with
`docker compose -f docker-compose.dev.yml up minio minio-init`. Supply the
required `LACE_MINIO_ROOT_*` variables in a local ignored `.env`; local API
credentials can use the same values. The `minio-data` named volume preserves
development objects across restarts.

`GET /health/live` only confirms that the HTTP process is serving. `GET
/health/ready` performs one local SQLite `SELECT 1`; bucket reachability is
checked once before startup, not on every readiness request.

## Current boundaries

The cache always misses and the build trigger reports unavailable. The Node
runtime streams verified MinIO media through authenticated previews and stable
published-media URLs; external build dispatch and configuration-module loading
remain later work. The test actor is a Vitest-only adapter and is never enabled
by a request header, query string, or production environment variable.
