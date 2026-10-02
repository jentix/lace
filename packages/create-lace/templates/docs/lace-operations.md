# Operating this Lace project

Run the generated project with packaged API/admin runtimes and an editable Astro site. You own `lace.config.ts` and `site/`; the engine checkout is unnecessary.

## Prerequisites and generation

Use Node `>=24.12.0 <25`, pnpm 12 and Docker Compose. Obtain compatible Lace packages, generator and API/builder image tags from the same release. This template selects Lace `0.1.0-alpha.1`, ownership template `0.4.0`, and matching `ghcr.io/lacecms/api:0.1.0-alpha.1` / `ghcr.io/lacecms/builder:0.1.0-alpha.1` images. The npm alpha channel is `next`; use the exact version below for reproducible generation. These coordinates become downloadable only after owner publication. Before publication, repository verification uses local artifacts; ordinary consumers must wait for publication rather than patch dependency references.

After the owner publishes the complete compatible alpha set, generate and install:

```bash
pnpm create lace@0.1.0-alpha.1 my-site
cd my-site
pnpm install
pnpm env:prepare
```

`pnpm env:prepare` runs the packaged `lace env prepare` before `.env` exists. It preserves the template's local settings, generates independent cryptographically random `LACE_AUTH_SECRET`, `LACE_MINIO_ROOT_ACCESS_KEY`, `LACE_MINIO_ROOT_SECRET` and `LACE_BUILDER_SECRET`, and leaves `LACE_BUILD_TOKEN` empty. It prints no credentials and publishes a complete `.env` with owner-only POSIX permissions (`0600`). On Windows, verify equivalent owner-only ACLs. Never commit `.env` or use default credentials.

Preparation refuses to replace any existing `.env`, including concurrent creation. If you already have one, retain it and review its settings privately; this command does not rotate credentials. A missing, symlinked or malformed `.env.example` must be restored as a regular file with one single-line `NAME=value` assignment for each generated credential and `LACE_BUILD_TOKEN`. Filesystem failures require checking directory permissions and hard-link support. If preparation was forcibly stopped, `.env` is either absent or fully written; private ignored `.lace-env-*` staging directories can be removed after confirming no preparation is running. Retry only when `.env` is absent.

This preparation flow requires packages packed from the revision that implements Step 26C (or a later compatible published release). Previously published `0.1.0-alpha.1` artifacts are not retroactively updated. The next coherent alpha artifact/version refresh is a separate release step.

MinIO is built once from the pinned source in `deploy/minio.Dockerfile`, requiring network access to its source and Go modules and sufficient disk space. Review `LACE_API_IMAGE` and `LACE_BUILDER_IMAGE` in `.env` and select compatible image tags.

Keep `LACE_BUILD_TOKEN` empty until setup finishes. Local API startup does not need it; starting the full builder requires a real read-only build token. Keep these settings aligned:

| Setting                | Local host value           | Purpose                                                |
| ---------------------- | -------------------------- | ------------------------------------------------------ |
| `LACE_DATABASE_PATH`   | `./.lace/data/lace.sqlite` | CLI database shared with API `/data/lace.sqlite` mount |
| `LACE_API_PORT`        | `3000`                     | Host API/admin port                                    |
| `LACE_PUBLIC_BASE_URL` | `http://127.0.0.1:3000/`   | Browser API/admin origin and public media URLs         |
| `LACE_API_BASE_URL`    | `http://127.0.0.1:3000/`   | Host Astro authenticated export transport              |
| `LACE_HTTP_PORT`       | `8080`                     | Full Compose static-site/web port                      |

If you change the API port, change both host URLs. Log in using the exact `LACE_PUBLIC_BASE_URL` origin; `localhost` and `127.0.0.1` differ. Compose overrides the builder export transport to `http://api:3000/`, while media retains the browser-facing URL. Intentional public base-path prefixes are preserved; your reverse proxy must route them.

## Migrate, sync and create the first administrator

Run from the generated root. Operator scripts load `.env` without sourcing it as shell code:

```bash
pnpm db:migrate
pnpm content:sync
pnpm auth:bootstrap
pnpm dev:api
```

Migrations are explicit and repeatable; the API does not apply them on startup. With packages built after the fresh SQLite migration fix (26A), `pnpm db:migrate` creates missing parent directories for `LACE_DATABASE_PATH`, including `.lace/data`, and preserves existing database contents. No manual directory creation is needed with those rebuilt packages. The originally published `0.1.0-alpha.1` packages predate this fix; until a release includes it, those packages still require `mkdir -p .lace/data` before their first migration. Sync creates the singleton Home draft and registers Posts. Bootstrap prints a one-time setup token and expiry. Capture it privately. Bootstrap refuses after first-admin setup completes; for an expired unused token, run bootstrap again before completing setup.

The initial alpha has no browser setup wizard. Create the first admin through `POST /api/v1/setup/admin` using exactly `token`, `email`, and `password` (12–1024 characters). This Bash snippet prompts through the terminal without recording credentials in shell history, loads the API origin from `.env`, and prints only status:

```bash
bash <<'SH'
read -r -s -p 'Setup token: ' LACE_SETUP_TOKEN < /dev/tty
printf '\n' > /dev/tty
read -r -p 'Admin email: ' LACE_SETUP_EMAIL < /dev/tty
read -r -s -p 'Admin password (at least 12 characters): ' LACE_SETUP_PASSWORD < /dev/tty
printf '\n' > /dev/tty
export LACE_SETUP_TOKEN LACE_SETUP_EMAIL LACE_SETUP_PASSWORD
node --env-file=.env --input-type=module <<'JS'
const response = await fetch(new URL('api/v1/setup/admin', process.env.LACE_PUBLIC_BASE_URL), {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    token: process.env.LACE_SETUP_TOKEN,
    email: process.env.LACE_SETUP_EMAIL,
    password: process.env.LACE_SETUP_PASSWORD,
  }),
});
if (!response.ok) {
  console.error(`Setup failed (HTTP ${response.status}). Check API readiness, unused token/expiry and password length.`);
  process.exitCode = 1;
} else {
  console.log('Administrator created. Sign in at the configured API origin /admin/.');
}
JS
SH
```

Successful setup consumes the setup token. It is not a password or build token. Open `http://127.0.0.1:3000/admin/` (or your configured API origin) and sign in with that email/password. In Settings create a read-only build token and copy its one-time value to `LACE_BUILD_TOKEN` in `.env`. It authorizes only published exports, not editing or draft access. Replace expired/revoked build tokens through Settings; never put credentials in `VITE_*`, `LACE_PUBLIC_*`, HTML or source control.

## Publish and build the editable site

In Admin open Home, set its title, add blocks, save and publish as the admin. Upload images through Media and select them in image/hero blocks. Both Home and Posts support `hero`, `richText`, `image`, `quote` and `cta`. For a blog page create a Posts entry, set a valid slug/title, save and publish. Editors can save drafts; publication requires an admin.

```bash
pnpm dev
# Stop and restart Astro after publication or token/env changes.
pnpm build
pnpm typecheck
```

`dev` serves editable Astro at its printed URL, normally `http://localhost:4321/`. Each build reads one authenticated published export and derives `/` and `/blog/:slug` routes from it. Publish Home before building. Later draft edits do not change built content. Missing/rejected credentials, unavailable API, unpublished Home and unsupported blocks fail with corrective diagnostics. Run a fresh build after publication; development caches a successful export until restart.

## Full Compose build and persistence

Once the real build token is configured, run `pnpm prod:start`. It starts API/admin, MinIO, explicit migration, dispatcher, fixed-command builder and web proxy. The builder reads generated source read-only and publishes successful static releases atomically. Visit `http://127.0.0.1:8080/` after a successful build. Publication queues a build; Settings also offers an explicit build request. If earlier publications were already built, request a fresh build in Settings. Failed builds retain the last successful release; inspect build history and request retry after correcting the cause. Rendered images use the host API URL, not `http://api:3000/`.

`pnpm dev:stop` and `pnpm prod:stop` retain SQLite in `.lace/data/` and MinIO/static-output volumes. Restart with the corresponding start command. Use `docker compose down --volumes` and remove `.lace/data/` only for disposable test deployments after backing up valuable content.

## Configuration, routes, renderers and styling

`lace.config.ts` defines models. `pnpm content:sync --check` reports pending/incompatible changes without writing (pending changes exit with code 2). Normal sync applies valid plans atomically and refuses incompatible changes without partial application. Changes to kind, fields, routes or allowed blocks on populated models can be blocked even with a version increment. This alpha has no general content migration tool; plan a deliberate migration instead of deleting production data. Restart API services after config changes to reload the mounted configuration.

Adding a model does not create an Astro route. Add the route in `site/src/pages/` and derive entries in `site/src/lib/site-data.ts` using the same export. Custom blocks need a component and registration in `BlockRenderer.astro` and `lib/rendering.ts`; unknown blocks fail with model, entry and block identifiers. Keep safe URL and structural rich-text validation. These source files belong to you and upgrades never silently overwrite them.

Style in `site/src/styles/global.css`. Stable hooks are `data-lace-model`, `data-lace-entry`, `data-lace-block`, `data-lace-block-key` and `data-lace-part`; tags and incidental classes are not the selector contract:

```css
[data-lace-block="hero"] {
  padding-block: 2rem;
}
[data-lace-model="home"] [data-lace-block="hero"] [data-lace-part="heading"] {
  color: #174f43;
}
[data-lace-entry="your-entry-id"] [data-lace-block-key="your-block-key"] {
  max-width: 48rem;
}
```

Block keys are unique within an entry, so scope instance selectors by entry. Built-in parts: hero `eyebrow`, `heading`, `body`, `media`, `action`; richText `content`; image `media`, `caption`; quote `text`, `attribution`; cta `heading`, `body`, `action`. Optional parts are absent when their content is absent.

## Optional Cloudflare Pages

`--cloudflare` adds Pages config and a manual workflow. After a build against your configured API, run `pnpm exec wrangler pages dev site/dist` for local Pages preview. Workflow installation needs compatible published packages; provide API/public URLs and build credentials in CI, never generated files. The CMS Worker is a separate versioned deployment. Complete Cloudflare consumer onboarding, real deployment, artifact preparation and the stable-MVP gate remain separate work.
