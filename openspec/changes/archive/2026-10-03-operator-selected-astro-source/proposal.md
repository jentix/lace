## Why

Step 29, session **29A — Operator-selected Astro source**, addresses onboarding feedback §10: a CMS generated in `cms/` currently rebuilds its example `cms/site/`, even when the operator intends to publish an existing Astro site in the parent directory. The builder must select that single project explicitly without weakening fixed-command execution or atomic static releases.

## What Changes

- Add deployment-time source-root mounting, installation-root lockfile selection, relative Astro project and output selection. Generated projects default to their own `site/`; reference Compose explicitly selects `apps/site`. Support standalone Astro roots and pnpm workspace packages alongside a separate CMS directory.
- Validate mounted source and relative paths, reject unsafe or inaccessible selections, retain filtered read-only source copies, frozen installation, published-version checks, sanitized failures and previous-release preservation. Run image-defined Astro commands without request-selected scripts or arguments.
- Expose a bounded, operator-defined site ID and display label through a read-only authenticated endpoint, displayed as the **current configured build site** in Builds and Settings. No filesystem paths, historical site attribution or deployment-success claims are added.
- Update generated Compose/env, onboarding, ownership metadata and upgrade guidance for compatible new artifacts. Preserve the generator's empty-target rule and all user-owned site source.
- Verify generated, external standalone and external workspace sites, including a real mounted consumer where the unused generated example has different HTML.

Dependencies: completed Steps 26–28 and Step 21's builder/dispatch contracts. Scope is only 29A. Non-goals: 29B publication/dev refresh investigation, automatic integration or renderer installation into an existing project, arbitrary command configuration, multiple sites, provider provisioning, Cloudflare build execution, release publication and retrospective attribution of old builds.

## Capabilities

### New Capabilities

- `build-site-selection`: Explicit deployment selection, safe current-site DTO and authenticated Builds/Settings presentation shared by Node and Worker.

### Modified Capabilities

- `fixed-command-vps-builder`: Replace inferred layouts with validated explicit Astro selection and fixed direct Astro execution for workspace and standalone installs.
- `project-generator`: Deliver explicit default site configuration and upgrade-safe managed template changes.
- `generated-project-onboarding`: Document selected-source mounts and external-site integration prerequisites instead of promising only the generated example.

## Impact

Architecture references: §§4.1–4.3, 4.8, 5, 6, 7, 9.8, 12–13, 17, 20–22. No architecture invariant changes or database migrations are required. Accepted references also include `site-build-dispatch`, `rest-contracts`, `public-sdk`, `vps-composition` and `admin-users-and-settings`; their queue, authorization and release semantics remain intact.

Affected code: `apps/builder` runner/settings, reference Compose, generated Compose/env/docs/inventory, `packages/contracts` safe identity schemas, `packages/server` app input/read route/OpenAPI, Node and Worker composition inputs, admin transport/Builds/Settings and focused tests. A deployment adapter owns filesystem interpretation; domain/application/database packages receive no paths. Template version advances from `0.6.0` to `0.7.0` with reviewed migration instructions. Package/image publication and the coordinated alpha refresh remain Step 32 work.
