# Operating this Lace project

Edit `lace.config.ts` and `site/` here. The API, admin application, and builder run from versioned images or packages; their source is not part of this project.

## Node development

1. Run `pnpm install` with released `@lacecms/*` packages. Have Docker Compose, network access to the pinned MinIO source and Go modules, and enough disk space to build its image once. Copy `.env.example` to `.env`, choose your own long secrets, and set compatible `LACE_API_IMAGE` and `LACE_BUILDER_IMAGE` tags. Before the first administrator exists, set `LACE_BUILD_TOKEN` to a temporary nonempty value; replace it with an actual build token after setup.
2. Export the local operator settings with `set -a; . ./.env; set +a`. Run `pnpm db:migrate`, `pnpm content:sync`, and `pnpm auth:bootstrap` from this directory. Capture the one-time setup token privately.
3. Run `pnpm dev:api`. The API and MinIO start in Docker and use this project's `lace.config.ts` and `.lace/data/lace.sqlite`. Complete first-admin setup through `/admin/` on the API origin.
4. In another terminal, run `pnpm dev` for the editable Astro site. Publish the home page before building static output with `pnpm build`.

The CLI and API use the same project-local SQLite database. The `.lace/data/` directory and `.env` are ignored by Git. Stop local services with `pnpm dev:stop`; this keeps persistent content.

## Compose production

Create a build token in Admin Settings and place its one-time value in `LACE_BUILD_TOKEN` in `.env`. Run `pnpm prod:start` to start the API, MinIO, builder, dispatcher, and web proxy. Compose builds MinIO from the pinned source release in `deploy/minio.Dockerfile`; no MinIO registry image is required. Compose runs the checked-in migrations as an explicit one-shot service before API readiness and prepares the static-output volume ownership before builder and web start. The API is exposed at `LACE_API_PORT` (default 3000), and the web proxy at `LACE_HTTP_PORT` (default 8080). The builder reads the generated project as a read-only source mount and publishes static releases to its own volume.

Run `pnpm prod:stop` to stop services without deleting content. To reset test-only deployments, use `docker compose down --volumes` and remove `.lace/data/` only after backing up anything needed.

## Optional Cloudflare Pages

Projects generated with `--cloudflare` include `wrangler.jsonc` and a manual Pages deployment workflow. After building the site, run `pnpm exec wrangler pages dev site/dist` for a local Pages preview. The workflow needs Pages project/account settings and a deploy token in its CI environment. The CMS Worker is a separate versioned deployment; this Pages template does not contain editable Worker source.
