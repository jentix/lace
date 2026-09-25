# Lace reference Astro site

`apps/site` is the static reference implementation for the starter `home` and
`posts` models. It reads only a published build export through `@lacecms/sdk`.

## Build inputs

Fixture mode is the default and uses the committed published export, so it
requires no CMS connection:

```sh
pnpm --filter @lacecms/app-site build
```

Set `LACE_SITE_DATA_MODE=live` for a live build. It requires
`LACE_API_BASE_URL` and `LACE_BUILD_TOKEN`; the site performs one authenticated
build-export request and derives every route from it locally. `LACE_API_BASE_URL`
is also used to build stable public-media URLs unless `LACE_PUBLIC_BASE_URL`
supplies a separate browser-facing origin, as in the local Docker stack. It defaults to
`https://cms.example.test/lace` only for the committed fixture.

```sh
LACE_SITE_DATA_MODE=live \
LACE_API_BASE_URL=https://cms.example/lace \
LACE_BUILD_TOKEN=replace-me \
pnpm --filter @lacecms/app-site build
```

For the local same-origin development stack, create a token through the admin
API and set live mode in the ignored `.env` as described in the root
[README](../../README.md#show-published-content-on-the-local-site). Restart the
site process after each publication to refresh its cached export and routes.
Draft saves do not appear on the public site.
