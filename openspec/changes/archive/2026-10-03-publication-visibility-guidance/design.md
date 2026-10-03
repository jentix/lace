## Context

See `proposal.md` for motivation. Before changing anything, the new `publication-visibility` acceptance phase was run in observe-only mode on 2026-10-03 against freshly packed packages and the 29A API/builder images (template 0.7.0). Observed baseline:

| Mode | Publish change to `/` and existing post | Draft-only save | Newly published slug |
| --- | --- | --- | --- |
| Generated Astro dev | **stale** on reload for both routes | hidden | 404 until restart |
| Independent existing-site dev (SDK read in page code, post entry via `getStaticPaths` props) | `/` fresh on reload; post **stale** | hidden | 404 until restart |
| Manual static build | old `dist` unchanged; fresh build contains it | hidden after build | — |
| Compose automatic | served after covering build: `absent > pending > pending:new > succeeded` | no build requested | served after build |

Causes: the generated `site-data.ts` memoizes its first successful export for the life of the module (`siteData ??= …`); Astro 7 dev evaluates the module once, so every page reuses that promise. Independently, Astro dev caches `getStaticPaths` results per route until a source change or restart (`RouteCache`), so props and the route set are frozen. The VPS dispatcher keeps a build row `pending` throughout the synchronous builder call and records `succeeded` after the builder switched `current`, so new HTML can be served moments before success is recorded; `running` is used only by providers that return an accepted ID (Cloudflare). nginx serves releases with `ETag`/`Last-Modified` and no `Cache-Control`, which permits browser heuristic freshness after a release switch.

Astro 7 also auto-detects agent environments and backgrounds `astro dev` (`ASTRO_DEV_BACKGROUND`, lock file); the harness runs it in the foreground with `--ignore-lock` so it can stop and restart servers deterministically. This is a harness concern, not consumer guidance.

## Goals / Non-Goals

**Goals:** make generated dev reflect publications to existing routes on reload; keep static builds single-snapshot; make Compose HTML revalidate; describe each mode truthfully in docs and Admin; keep a re-runnable observation that guards the claims.

**Non-Goals:** dev route-set refresh (would require an Astro integration or content layer), changing the engine reference `apps/site` or its contributor restart flow, changing dispatcher status semantics, Cloudflare deployment verification, API/DTO changes.

## Decisions

### 1. Dev revalidation with the export ETag; build stays memoized

`createSiteDataLoader` gains a `revalidate` option. The exported `getSiteData` sets it from `import.meta.env.DEV`. With revalidation, each call issues `getBuildExport({ etag })` using the last validated export's tag; `304` reuses the cached derived data, `200` validates and replaces it. Concurrent calls within one render share an in-flight promise. Errors propagate (with existing diagnostics) and clear the in-flight promise; the last good data is not silently served, because a stale page would contradict the API state the operator just changed. Without revalidation (static build), behavior is unchanged: one export per process, expected-version check, retry after failure.

The expected-published-version check applies only to builds (`LACE_EXPECTED_PUBLISHED_VERSION` is set by the builder); dev requests compare nothing. Alternative rejected: a time-based TTL — it either stays stale or polls unnecessarily, while the ETag request is cheap and exact.

### 2. Post page reads by slug; route set changes still need restart

`blog/[slug].astro` returns only `params` from `getStaticPaths` and looks up the current post by `Astro.params.slug` from `getSiteData()`. In a static build both come from the same memoized export, so output is identical. In dev, a slug no longer present returns a `404` response instead of stale props. New slugs remain 404 until restart because Astro caches static paths; this is documented rather than worked around. Alternative rejected: an Astro dev integration polling the API to emit `astro:content-changed` — it adds user-owned infrastructure, a background poller and private Astro event coupling for a dev-only convenience.

### 3. Proxy revalidation header

Generated `deploy/nginx.conf` adds `add_header Cache-Control "no-cache" always;` to the site `location /` (and the `@no_release` fallback). nginx validators stay, so revalidation is cheap. API/admin locations are untouched. This is a managed file: template `0.8.0`, upgrade instructions and snapshot updates. Hashed `_astro` assets could be cached longer, but per-path tuning is outside this unit.

### 4. Admin follows the persisted covering build

The publish result already returns `{ status: "queued", targetVersion }`. `EntryPage` keeps that object (not just the status). A new `PublicationBuildState` in the entry page area uses the existing `adminQueryKeys.builds` query (`listBuilds`) with a 5-second refetch until a terminal state, and the existing `buildSite` query for the label. Selection: builds with `targetVersion >= published version`; prefer succeeded, then pending/running, then failed; none → "waiting to be recorded". Copy distinguishes pending ("queued or building"), running, succeeded ("the static release includes version N; Astro dev and manual deployments are separate") and failed ("previous release stays served"), with a Builds link for non-success. History load errors keep the dispatch message and link. No new endpoints, DTOs or permissions: Builds history and build-site identity are already readable by every authenticated role.

Builds gains a static "When published content becomes visible" section; the tour's publication and Builds steps adopt the same verified mode summary. The shared copy lives in the publish-entry feature so the editor, Builds and tour do not drift.

### 5. Evidence and documentation

`scripts/publication-visibility-acceptance.mjs` is wired as the `publication-visibility` phase of `generated-project-acceptance.mjs`, using packed packages, a disposable independent site with its own lockfile, and the same Compose stack. Expectations encode the verified behavior; `LACE_VISIBILITY_OBSERVE=1` records without asserting. Results and artifact identities are recorded in `docs/archive/step-29/step-29b-verification.md`. Generated README and operations guide replace the "restart after publication" instruction with per-mode guidance; the roadmap and onboarding feedback record completion.

## Risks / Trade-offs

- [Dev revalidation adds one conditional request per page render] → `304` bodies are empty and the API already supports conditional exports; dev only.
- [Operators expect new slugs in dev without restart] → documented explicitly in README, operations guide, Builds and tour.
- [Existing consumers keep the memoizing loader in user-owned source] → upgrade instructions describe manual adoption; the old behavior remains correct for static builds.
- [`pending` covers both queued and building on VPS] → Admin copy says "queued or building"; docs explain the short success-recording window rather than changing dispatcher semantics.
- [Cloudflare `succeeded` may mean the hook accepted without an ID] → Admin never equates succeeded with provider deployment; wording refers to the static release built by the configured builder.

## Migration Plan

No database or API migration. New projects get template `0.8.0`. Existing projects run the template upgrade to update `deploy/nginx.conf` and `docs/lace-operations.md` (conflicts reviewed as usual), recreate the `web` service, and optionally copy the dev-revalidation loader/post-route pattern into their user-owned site. Admin guidance requires compatible freshly built admin artifacts; proxy and documentation changes do not. Rollback restores the previous managed files; no data changes.
