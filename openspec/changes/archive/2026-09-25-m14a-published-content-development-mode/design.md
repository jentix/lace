## Context

See proposal.md. The SDK already provides authenticated `getBuildExport`; `apps/site/src/lib/site-data.ts` already has fixture and live loaders, but defaults to fixture. `docker-compose.dev.yml` passes no live variables to the site. The first administrator and build token must be created after the API starts, and `dev:smoke` must remain usable against an isolated new stack. The accepted `public-sdk`, `astro-reference-site`, and `local-node-development` specs constrain this change.

## Goals / Non-Goals

**Goals:** Make live mode an explicit, secure local site configuration; retain a working bootstrap path; provide a repeatable publication refresh; identify local failures without leaking credentials.

**Non-Goals:** Browser-side fetching, automatic rebuild dispatch, a Settings UI, additional Astro routes, or changes to the public API/SDK credential scope.

## Decisions

1. **Use a two-stage local setup.** Keep the stack's initial site in fixture mode so `dev:node`, `dev:smoke`, admin bootstrap, and the first token creation remain healthy without a credential. Once an administrator creates a token through `POST /api/v1/admin/api-tokens`, they add `LACE_SITE_DATA_MODE=live` and `LACE_BUILD_TOKEN` to the ignored `.env` and recreate the site container. Compose passes the mode, token, and an internal `http://api:3000` SDK base URL only to the site process; the browser still uses the same-origin gateway and public-media URLs must use the browser-reachable API origin. The token is not sent to Vite client environment or an Astro public variable. A default token or credential created during bootstrap is rejected because it would bypass explicit admin issuance. Requiring the token at first stack start is rejected because it prevents the first administrator from issuing it.
2. **Keep fixture tests explicit and live refresh manual.** The existing site loader remains the single SDK/export boundary. Local live mode loads a published export at site process start or module evaluation. After publishing, recreate or restart the site process and reload the browser to refresh its cached export and static paths. A browser-only reload is not promised to refresh route discovery. `dev:smoke` forces fixture mode regardless of the user's ordinary `.env`, preserving isolated setup. An implicit polling loop or build dispatch is rejected because it expands 14A and weakens the one-export build behavior.
3. **Translate known SDK failures at the site boundary.** The loader gives targeted messages for missing token, `LaceHttpError` authentication/authorization failures, `LaceTransportError`/timeout, and missing published home. It never includes the token or dumps request headers. Other contract errors keep their typed cause rather than being mislabeled as credential failures. Tests inject fetch responses and failures to cover those branches, plus one live request and fixture isolation. Avoid changing SDK error classes or server behavior.
4. **Run local bootstrap from the API package boundary.** The first live-stack exercise found that `scripts/dev-bootstrap.mjs` imports `@lacecms/platform-node` from the workspace root, while the API container's filtered install links that dependency under `apps/api`. Move the fixed bootstrap entry point under `apps/api` and invoke it there so Node resolves the declared package dependency. Retain the same local-only, once-shown setup-token behavior. Adding a root runtime dependency or creating an alternative bootstrap path is rejected because the API package already owns the dependency and the local stack must use the documented command.
5. **Keep Astro as the site container's main process.** The first live refresh exercise found that a later site restart could exit immediately through the nested `pnpm run` wrapper, leaving the gateway's site upstream unavailable. After the filtered install, the Compose command executes the installed Astro binary directly so process signals and exit status belong to Astro. The developer guide keeps a full stack stop/start as its supported refresh path; the isolated live check must prove it restores the site after draft and publication changes.
6. **Cache only a successful export.** Site health checks can reach Astro before the API is ready during a full-stack restart. The loader currently memoizes a rejected promise, preventing recovery after the API becomes healthy. Clear the cached promise on failure so the next request can retry; concurrent callers still share the same in-flight read and a successful export remains cached until process restart.

## Risks / Trade-offs

- [Astro can cache module data and static paths through development reloads] → Document site process recreation after publication; verify a changed export is visible after that action.
- [The API's container hostname is unusable in rendered public media links] → Separate internal export-fetch URL from browser-facing media URL, or use the gateway origin as the SDK base URL when it is reachable from the site container; test both export requests and emitted media links.
- [A token can leak through shell history or copied examples] → Document a once-shown token flow, an ignored `.env`, redacted examples, and no log of the value. Keep Compose configuration server-side.
- [A site container configured live before any home publication may fail its root healthcheck] → Make the error direct contributors to sync and publish `home`; the API/Admin remain available to do so.
- [Filtered container installs omit root links for API dependencies] → Keep the bootstrap script within the API package and verify it in an isolated Compose stack.

## Migration Plan

No database or API migration. Existing local environments continue in fixture mode until the operator creates a build token and opts into live mode. Reverting the change restores the fixture-only Compose setup; token records may be revoked through the existing admin API.
