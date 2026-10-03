## Context

See `proposal.md` for motivation and scope. The current runner copies `/source`, requires three root workspace files, guesses between `apps/site` and `site`, runs package build scripts, and copies a hard-coded `dist`. `main.ts` fixes scratch and release storage at `/work` and `/output`. The generated Compose mounts its own root; a separate existing site's host directory is therefore absent from the container.

Build history DTOs contain lifecycle data but no site identity. Builds can be read by all authenticated roles; `/admin/settings/status` is administrator-only. The architecture's data model represents one site and has no need for site records. Accepted release switching and trigger contracts already cover authorization, serial execution, version checks and previous-release preservation.

## Goals / Non-Goals

**Goals:** Choose one static Astro project from a reproducible installation; make mount interpretation explicit; describe current site configuration safely in both admin screens; retain the existing durable lifecycle.

**Non-Goals:** Historical per-build site attribution, arbitrary script/command/lockfile names, runtime site editing, automatic SDK/renderer injection, external CI orchestration and publication-mode conclusions. The filesystem selection is a VPS concern; shared identity/read authorization also work in Worker deployments without introducing Node filesystem dependencies.

## Decisions

### 1. Deployment inputs have separate host and container responsibilities

Use these explicit settings:

| Setting | Interpretation | Generated default |
| --- | --- | --- |
| `LACE_BUILD_SOURCE_ROOT` | Compose host bind source, relative to the Compose project directory or absolute host directory | `.` |
| `LACE_BUILD_SITE_DIR` | Astro directory relative to the mounted installation root | `site` |
| `LACE_BUILD_OUTPUT_DIR` | Output directory relative to the selected Astro directory | `dist` |
| `LACE_BUILD_SITE_ID` | Safe current site identity, not a filesystem path | `main-site` |
| `LACE_BUILD_SITE_LABEL` | Safe operator-authored display name | `Main site` |

Compose uses a long bind mount with `read_only: true` and `bind.create_host_path: false`, always targeting `/source`. Only relative site/output settings go to the builder. Installation root means the source root containing the selected dependency graph and `pnpm-lock.yaml`; lockfile selection is accomplished by choosing that root, not by accepting a separate arbitrary filename. `/work` and `/output` remain image-defined and disjoint. API and builder use the same identity inputs from generated Compose; identity is not sent by the HTTP trigger.

Generated default: source `.`, site `site`. Standalone existing root with CMS in `cms/`: source `..`, site `.`. External workspace with `web/` and `cms/`: source `..`, site `web`. Reference root Compose explicitly selects `apps/site`; no inference remains in the runner. A directory may contain both the selected site and the unused example.

Reject environment-selectable executables, HTTP paths and host paths forwarded into the runner: they obscure mount boundaries or weaken the closed trigger. The fixed output volume avoids collisions with consumer source and keeps existing nginx serving behavior.

### 2. Validate a selected installation before executing tools

Add a builder-owned settings/layout module; Node filesystem operations stay in `apps/builder`. Normalize project `.` specially. Otherwise accept bounded slash-separated relative directory segments containing letters, digits, underscore, dot, hyphen or spaces; reject `.`/`..` segments, leading hyphens, absolute paths, empty segments, backslashes, control characters and excessive length. Output cannot be `.` or an ancestor of the site. Validate path components with `lstat`, containment against resolved roots, regular root package/lockfile and selected package files, and a declared direct Astro dependency. Workspace selection requires the site to belong to the root workspace installation; frozen installation failure remains an install failure. Standalone selection at `.` requires no workspace manifest. Reject nested independent lockfiles for a non-root selection rather than silently install the wrong graph; the operator can instead mount that independent root.

Retain all existing copy exclusions and symbolic-link/special-file rejection. Exclude the configured output subtree even when its name is not `dist`; exclude generated `.lace/data` subtrees when CMS lives beneath the installation root. An invalid source returns `source_invalid`, with no raw path. Recheck required copied inputs before tools run to catch incomplete copies. Source remains user-owned and read-only; all generated work lives under scratch.

### 3. Invoke fixed direct Astro commands

Use pinned `pnpm install --frozen-lockfile` in the copied installation root for both standalone and workspace installations. Run `pnpm --dir <selected-project> exec astro build --outDir <selected-output>` through argument-array spawning, never shell interpolation. Relative selections are validated data and cannot introduce flags; the image owns the command shape. No environment-selectable script, executable or custom arguments are supported. The runner's existing test-only tool seam remains unavailable through production settings.

Use the existing allowlisted child environment, server-only build token, internal export origin, public media origin and expected published version. External source is trusted operator code just as generated source is; pnpm/Astro may execute its hooks/configuration. Existing sites must implement the published-export SDK/version contract themselves. Do not claim version checks alone prove that arbitrary site code consumed the CMS export.

Require a newly produced regular `index.html`, reject symlinks and special files recursively in output, and reject an Astro server/hybrid output rather than publish a partial SSR artifact as static. Preserve pre-build, post-build and pre-switch published-version checks. Keep serialization, synchronous success, bounded failure categories, scratch cleanup, two-release retention and atomic `current` replacement. Failure never replaces the served release.

Alternative: running each package's `build` script preserves arbitrary scripts but makes the executable build behavior project-selected. Direct Astro is the fixed contract. Full workspace frozen installation is broader than the existing reference filter, but reliably includes unnamed external packages and local workspace dependencies; no package-name convention is introduced.

### 4. Report current identity separately from persisted build rows

Add shared strict `buildSiteIdentitySchema` and `buildSiteSelectionSchema` in contracts, with `{ site: { id, label } | null }`. Validate ID and label with the bounds in the delta. Server app input accepts only this portable identity; adapters read two identity environment settings, with both absent giving `null`, and one absent/invalid rejecting startup without printing values. Share portable validation through the existing contracts dependency, without moving filesystem settings into `config` or the application layer.

Add `GET /api/v1/admin/build-site` with existing authenticated `content:read` authorization and schema-backed OpenAPI. No query/path/body selects a site and no write endpoint exists. Wire identity in both Node and Worker composition, including reference development composition. Worker can expose `null` or an explicitly configured safe identity for its provider-managed site; this does not assert provider completion.

Admin transport owns a validated identity query and cache key. Builds displays a separate “Current build site” section for all roles even with no builds. Settings reuses it only within its existing administrator guard. Display label/ID or an unconfigured state, with loading/error/retry and established expired-session recovery. Do not render a site picker or put identity on historical rows. Changing deployment configuration changes current identity on restart while persisted history remains unchanged.

Alternative: persist site identity on every build. This requires queue/claim semantics during deployment changes and schema migrations to represent historical targets. Current configuration independently satisfies 29A; no database, outbox, application command or trigger response changes are needed. Manually deployed API/builder pairs must use matching identity; docs state that a label is operator configuration, not a verified mount handshake.

### 5. Version managed templates and document explicit integration

Advance ownership template `0.6.0` to `0.7.0`, update managed Compose/env/operations bytes and inventory checks, and add the repository's template-version migration instructions. Keep README user-owned, existing introductions untouched and managed-file hash conflicts reviewable. Template guides cover both layouts, roots/lockfiles, mounts, static release storage and all five SDK/rendering prerequisites; they link to existing renderer guidance without adding an installer. Update the builder README, CLI/generator docs and relevant deployment docs so examples do not teach layout inference.

Do not change published alpha versions or claim old images support the new settings. Tests use compatible freshly built artifacts; Step 32 coordinates the public artifact refresh. Step 29B independently verifies publication visibility; current refresh instructions are not changed speculatively here.

## Risks / Trade-offs

- External roots contain unrelated CMS files → retain exclusions, including nested database paths; verify sentinel secrets never reach scratch/output/logs.
- An external workspace may need private registries or unavailable dependencies → frozen install fails safely; credential forwarding and custom install commands remain outside scope.
- A site depends on custom prebuild scripts or non-static Astro output → document direct static Astro requirements and reject incompatible output rather than execute custom scripts.
- API identity can be manually misconfigured relative to the builder → generated Compose uses one set of values; manual deployments document matching inputs and truthful configuration-only presentation.
- Source can change while copied → operator deploys a stable reviewed checkout; validate copied inputs and preserve the existing version/atomic-release checks. This feature does not add a VCS checkout service.
- Existing consumers use older artifacts → migration guidance requires matching rebuilt versions and retains upgrade conflict detection; rollback restores previous template/artifacts without deleting release storage.

## Migration Plan

No SQL migration. In an existing generated deployment, review managed-file changes, retain README and source, set explicit identity and source/site/output, and recreate API/dispatcher/builder as applicable using compatible artifacts. The reference layout explicitly sets `apps/site`. For an external project, mount its actual dependency root and supply the existing site's published-export integration before requesting a build. The last release stays served until a valid selected-site build succeeds. Rollback restores previous deployment settings/images and selects the retained release using established operations; no source rewrite is required.

## Verification

Focused builder tests cover layout/path validation, source filtering, frozen install, fixed argument arrays, static output validation, version races, serialized requests and failed-release preservation. Contract/server/Node/Worker tests cover bounded identity, all role reads, anonymous denial, no writable route and no secret/path leakage. Admin tests cover empty history, settings guards, identity failure and session recovery.

Extend the existing isolated generated-consumer acceptance for this scope: retain a differing unused CMS example, build and serve a real external standalone site and a real external workspace package, exercise a failed build and corrected administrator retry, check current release bytes and scan output/diagnostics for sentinels. Use mounted compatible builder/API artifacts outside the engine checkout; fake tool tests alone cannot prove Astro or mount accessibility. Record tested artifact identities and limitations. Run root typecheck, Oxlint, Oxfmt and strict change validation before marking the change complete.
