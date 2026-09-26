# Lace

Lace is a self-hosted headless CMS with a static Astro site. This repository's
supported local workflow starts the complete Node, SQLite, MinIO, Admin, and
Astro development stack through one same-origin gateway.

## Local development

### Prerequisites

- Docker Desktop with Docker Compose v2;
- Node 24.12–24.x and pnpm 12;
- workspace dependencies installed with `pnpm install` (the containers install
  Linux-native dependencies separately).

Create the ignored local environment once. It generates unique local-only
credentials; do not commit `.env` or paste its contents into issues or logs.

```sh
pnpm dev:env
```

Start the stack:

```sh
pnpm dev:node
```

The command builds the development container, applies committed forward SQLite
migrations, creates the private MinIO bucket, and waits for the API, Admin, and
Astro development servers to become healthy. It preserves the named
`lace-dev-sqlite-data` and `lace-dev-minio-data` volumes across ordinary stops.

Open these URLs in the browser:

| Surface | URL |
| --- | --- |
| Node API and health | `http://127.0.0.1:3000/api/`, `http://127.0.0.1:3000/health/ready` |
| Admin | `http://127.0.0.1:3000/admin/` |
| Astro site | `http://127.0.0.1:3000/` |

The local admin also accepts `http://localhost:3000/admin/` on the same port.
Browser sessions are scoped to the hostname, so switching between `localhost`
and `127.0.0.1` may require signing in again. Restart the local API after
changing authentication code.

MinIO has no host port in this topology. The browser never receives its Docker
hostname or object-store credentials. API and health paths stay in the Node
application; `/admin/*` and site routes are proxied through the same origin,
including supported Vite/Astro upgrade connections.

### First administrator

With the stack running, mint one expiring setup credential:

```sh
pnpm dev:bootstrap
```

The command prints the plaintext token once and stores only its hash. Use it to
complete the first administrator through the setup endpoint, then sign in at
the Admin URL:

```sh
curl --fail-with-body http://127.0.0.1:3000/api/v1/setup/admin \
  -H 'content-type: application/json' \
  --data '{"email":"admin@example.test","password":"choose-a-long-password","token":"PASTE_THE_ONCE_SHOWN_TOKEN"}'
```

The token expires after one hour. The setup endpoint closes permanently after
the first administrator is created. The local stack applies migrations only;
configuration synchronization remains a deliberate operator operation.

### Show published content on the local site

The initial Astro site uses its committed fixture so the stack can start before
an administrator or build credential exists. After first-admin setup, run
`pnpm content:sync`, open `/admin/content`, and publish the `home` page. The
local site needs a published home entry to enter live mode.

Sign in as an administrator at `/admin/`, open **Settings**, enter a name such
as `local-astro-site` under **Build tokens**, and choose **Create build token**.
Copy the once-shown value and dismiss it after placing it in the server-side
environment file. The token list cannot reveal it later.

In the ignored `.env` created by `pnpm dev:env`, set
`LACE_SITE_DATA_MODE=live` and paste that value as `LACE_BUILD_TOKEN`. Restart
the stack to pass the new environment to Astro:

```sh
pnpm dev:stop
pnpm dev:node
```

The site at `http://127.0.0.1:3000/` now reads the published export through
the SDK. After each publication, repeat the two restart commands and reload the
browser to refresh Astro's cached export and routes. Saving a draft alone does
not change the public site, even after a restart. Automated build dispatch is
not part of this local workflow yet. Keep `.env` private and revoke a lost
token in **Settings**.

### Local product acceptance (Session 15C)

The isolated acceptance run uses its own Compose project, random host port,
credentials, SQLite and MinIO volumes. It does not reset `lace-dev`. Docker,
Node/pnpm, installed dependencies, and a Playwright Chromium browser are
required. Start from a clean acceptance project:

```sh
pnpm acceptance:start
pnpm --filter @lacecms/app-admin test:acceptance
pnpm acceptance:stop
```

`acceptance:start` applies committed migrations, explicitly synchronizes the
root `lace.config.ts`, and prints the assigned origin. It creates page drafts
for `home` and `about`; `posts` and `notes` begin as empty collections. The
browser check creates a random first-admin password through the local setup
flow, signs in, uploads and reuses a private image, publishes `home` and a
`notes` entry, issues a read-only token in Settings, switches the site to live
mode, and restarts only Astro. It verifies `/` and `/notes/acceptance-note`,
then saves a new note title and slug without publishing and confirms that the
build export and public route still show the previous publication. It also
creates editor and viewer accounts and checks their browser permissions.
Focused browser and API checks cover conflicts, error and empty states,
keyboard and narrow-screen navigation, and server-side authorization.

For a manual walkthrough, run `pnpm acceptance:start`, then
`pnpm acceptance:bootstrap` and complete first-admin setup as described above
using the printed acceptance origin. Open its `/admin/` URL, edit and publish
`home`, create and publish a `notes` entry, and upload an image on **Media** to
reuse in an image block. In **Settings**, create a build token, copy it into
the ignored `.lace-acceptance/.env` as `LACE_BUILD_TOKEN`, and set
`LACE_SITE_DATA_MODE=live`. Run `pnpm acceptance:restart-site`, then check `/`
and `/notes/<published-slug>` at the acceptance origin. Save a changed title
and slug without publishing, restart the site again, and confirm the old public
route and content remain. Content, Media, Users, and Settings have actionable
empty and error states. **Builds** explicitly describes its current state;
history and retry controls arrive in Step 21. Finish with
`pnpm acceptance:stop`, which removes only the named acceptance project and its
volumes. Do not use `pnpm dev:reset` for acceptance cleanup.

### Project content configuration

Edit [`lace.config.ts`](./lace.config.ts) to define pages and collections in
version-controlled code. The file contains `home` (`/`), `about` (`/about`),
`posts` (`/blog/:slug`), and `notes` (`/notes/:slug`) examples with fields and
allowed blocks. The Node API loads and
validates this file when it starts. After editing it, restart the local stack:

```sh
pnpm dev:stop
pnpm dev:node
```

Loading a definition does not add or change a SQLite model or content entry.
With the stack running and migrated, inspect the pending plan, then synchronize:

```sh
pnpm content:sync --check # read-only; exits 1 when work is pending or invalid
pnpm content:sync         # prints the plan, then applies valid changes
```

The first sync creates one editable draft for each page. Collections appear in
Admin with an empty entry list and a permitted create action. Repeating sync on
unchanged configuration is a no-op. Invalid changes print model-specific
diagnostics and leave SQLite content unchanged; fix the configuration and run
the command again. A stale-plan message means another sync changed SQLite
between planning and apply; rerun to review the current plan. Sync never runs
as part of startup or migrations. Route validation also does not create Astro pages: add or update
the matching route and renderer in `apps/site/src/pages/`. See
[the Node configuration guide](./docs/node-api.md#editing-content-models) for
key, version, field, block, and route examples, plus a repeatable
sync–Admin–publication–public-site check.

### Normal operations

```sh
pnpm dev:logs               # follow the same lace-dev topology
pnpm dev:stop               # stop containers, preserving local data
pnpm dev:smoke              # isolated stack; does not touch lace-dev data
pnpm dev:reset -- --confirm # permanently remove only Lace dev SQLite/MinIO data
```

`dev:reset` is intentionally the only destructive lifecycle command. Its data
cannot be recovered. To recover from a stale container dependency cache after a
lockfile change, run the explicit reset and start the stack again.

## Verification

Focused package checks are useful while developing a surface:

```sh
pnpm --filter @lacecms/app-api test
pnpm --filter @lacecms/app-admin test
pnpm --filter @lacecms/app-site test
```

Before completing a change, run the root quality gates:

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
pnpm spec:validate
```

## Troubleshooting

- `Missing .env`: run `pnpm dev:env`; it refuses to overwrite existing local
  credentials.
- A service does not become healthy: run `pnpm dev:logs`. Check that Docker has
  enough memory and that port 3000 is available; change `LACE_API_PORT` and the
  matching `LACE_PUBLIC_BASE_URL` in `.env` together if needed.
- Invalid settings are reported only by variable name, never by secret value.
  Correct the named `.env` entry and start again.
- A stale database or object-store state is never cleared automatically. Use
  the explicit reset only when discarding local development data is intended.
- `content:sync` needs the running local API container and migrated SQLite;
  start with `pnpm dev:node` first. If a page is shown without its draft in
  Admin, run sync and reload the page.
- A live site error about `LACE_BUILD_TOKEN` means the token is missing or was
  rejected. Create a replacement through the admin API, update ignored `.env`,
  and restart. If the API is unavailable, check `pnpm dev:logs` and
  `LACE_API_BASE_URL` inside the site container. If `home` is unpublished,
  synchronize configuration and publish it in Admin before restarting.

Detailed Node, authentication, and migration behavior is documented in
[docs/node-api.md](./docs/node-api.md),
[docs/auth-operations.md](./docs/auth-operations.md), and
[docs/database-migrations.md](./docs/database-migrations.md).
