## Why

Step 29, session **29B — Verify and explain publication visibility**, addresses onboarding feedback §12. Operators cannot tell when published CMS content reaches the site: generated guidance tells them to restart Astro dev after every publication, Admin reports only "Build pending" for a publish, and nothing explains the difference between Astro dev, a manual static build and the automatic Compose release. Feedback also records that an independently integrated existing site showed published content in Astro dev without a restart, so the restart instruction needs verification rather than repetition.

## What Changes

- Add a reproducible consumer acceptance phase that publishes, saves drafts and adds routes against packed artifacts and observes four modes: generated Astro dev, an independent existing-site Astro dev integration, a manual static build and the automatic Compose build/release. Record the observed refresh, route-set and HTTP cache behavior as verification evidence.
- Correct the reproduced generated-dev stale-data defect: the generated SDK loader memoized its first export for the whole dev process, so published changes to existing routes stayed invisible until restart. In Astro dev the generated loader revalidates the published export on each render with the export ETag; static builds keep exactly one validated export per build. Post pages read the current entry by slug instead of cached route props. A changed route set (new or renamed slugs) still requires restarting dev, because Astro caches static paths.
- Make served Compose HTML revalidate after a release switch by sending `Cache-Control: no-cache` from the generated web proxy instead of relying on browser heuristic freshness.
- Explain draft save, CMS publication, dev visibility, manual static build and automatic/deployed output separately in the generated README/operations guide, the upgrade instructions and Admin. The entry editor follows the persisted pending/running/succeeded/failed state of the build covering its publication, names the current configured build site when known, and never claims dev or manual deployment success from CMS state. Builds and the introductory tour present the verified mode guidance.
- Advance the managed template to `0.8.0` with upgrade instructions for the proxy and documentation changes, and manual guidance for adopting dev revalidation in user-owned site source.

Dependencies: completed Steps 26–28 and 29A. Non-goals: Astro content-layer integration or automatic dev route refresh, live/SSR rendering, a dev-server notification channel, changes to the engine reference `apps/site` contributor workflow, Cloudflare provider deployment verification, new API endpoints or DTOs, persisted per-build site attribution, renderer installation (Step 30) and artifact publication (Step 32).

## Capabilities

### New Capabilities

- `publication-visibility`: Verified mode-specific visibility of published content (generated and independent Astro dev, manual static build, automatic Compose release), draft isolation, served-HTML revalidation and the reproducible consumer evidence that backs operator guidance.

### Modified Capabilities

- `generated-project-onboarding`: The generated starter revalidates exports in dev while keeping one export per static build; README/operations explain each visibility mode and the dev route-set restart instead of a restart after every publication.
- `project-generator`: Managed template `0.8.0` with proxy revalidation headers and upgrade instructions that preserve user-owned site source.
- `admin-draft-editor`: Publication details track the persisted build covering the publication and the current build site, replacing the dispatch-only build state.
- `admin-introductory-tour`: Publication guidance is reconciled with the verified Step 29 modes.

The engine reference `apps/site` contributor workflow (`local-node-development`) keeps its accepted restart guidance; it is not a generated-consumer surface and is unchanged.

## Impact

Architecture references: §§4.1–4.3 (published exports, ETag and static release model), 4.8, 5, 6, 9.8, 12–13 (admin), 17, 20–22 (generated projects and upgrades). No architecture invariant changes, database migrations, API routes or contracts are required. Accepted references also include `site-build-dispatch`, `fixed-command-vps-builder`, `build-site-selection`, `public-sdk` and `vps-composition`; their coalescing, atomic release, closed-trigger and authorization semantics remain unchanged.

Affected code: `scripts/` consumer acceptance (new phase), generated `site/src/lib/site-data.ts` and post route, generated `deploy/nginx.conf`, `docs/lace-operations.md`, README, `.lace/upgrade-instructions.json`, `create-lace` inventory/version and snapshots, CLI upgrade test, admin entry publication details, Builds page and tour copy with focused tests, and repository roadmap/onboarding records. Generated user-owned site files change only for new projects; existing consumers adopt them manually.
