# Fixed-command VPS builder (Step 21B)

Build the image from the repository root:

```sh
docker build -f apps/builder/Dockerfile -t lace-builder:local .
```

The image runs Node 24.12.0 and pnpm 12.3.4. Mount a Lace project at `/source`
read-only, a scratch volume at `/work`, and a static-output volume at `/output`.
The reference repository is the supported source for this step. The project
must contain `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, and
`apps/site/package.json`. The service copies source to scratch space, runs
`pnpm install --frozen-lockfile`, then
`pnpm --filter @lacecms/app-site... build`. It serves no public site traffic.

Provide `LACE_BUILDER_SECRET` (at least 32 characters, shared only with the API),
`LACE_API_BASE_URL` (trailing slash), `LACE_BUILD_TOKEN` (read-only published
export token), and optionally `LACE_PUBLIC_BASE_URL`. Configure the Node API
with `LACE_BUILDER_URL` and the same `LACE_BUILDER_SECRET`. The builder listens
on container port 8788; Step 21C will connect it to the API through an internal
network without publishing that port. `/health` returns only `{"status":"ok"}`.

The API sends `POST /build` with `Authorization: Bearer <secret>` and exactly
`{"buildId":"...","targetVersion":N}`. Responses contain a fixed status, a
fixed-vocabulary log summary, and on failure one safe reason code. Build output
and environment values are never returned. Static output is under
`/output/releases/`; `/output/current` is a
relative symlink switched only after a complete version-matched build. The two
most recent successful releases are kept. If a build fails, `current` remains
unchanged. Roll back by atomically replacing `current` with a relative symlink
to the retained previous release.
