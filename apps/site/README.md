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
is also used to build stable public-media URLs in fixture mode. It defaults to
`https://cms.example.test/lace` only for the committed fixture.

```sh
LACE_SITE_DATA_MODE=live \
LACE_API_BASE_URL=https://cms.example/lace \
LACE_BUILD_TOKEN=replace-me \
pnpm --filter @lacecms/app-site build
```
