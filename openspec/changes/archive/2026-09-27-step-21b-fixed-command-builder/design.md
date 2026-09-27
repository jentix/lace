## Context

See proposal.md. The Node dispatcher already calls `SiteBuildTrigger`; the current Node default is a failure stub. `apps/site` builds from the published export through the SDK, and `apps/builder` is a scaffold. ADR 0004 fixes the trust boundary. The reference site is a pnpm workspace member, so the mounted source is the repository project until Step 23.

## Goals / Non-Goals

**Goals:** Keep the request protocol closed, run from a source snapshot, verify the export version, and switch static output with no partial release visible.

**Non-Goals:** Compose and reverse proxy wiring, a recovery process, build UI, or a generated-project template (21C and 23).

## Decisions

1. `apps/builder` owns a Node HTTP server and release runner. A dedicated bearer secret is checked with constant-time comparison before parsing a bounded JSON body. The JSON object must have exactly `buildId` and `targetVersion`; build ID is an opaque safe identifier and never becomes a path. A single process serializes requests, including duplicate IDs. Non-loopback deployment exposure is controlled by the 21C internal network. Rejecting extra keys is safer than ignoring them because it makes the protocol auditable.
2. The image fixes Node and pnpm versions, mount locations, install and build arguments. The runner has internal path injection for tests only; HTTP data cannot change it. Copy rejects source symlinks and skips `.git`, `.env*`, caches, and output. Installation uses `pnpm install --frozen-lockfile`, followed by the reference site's dependency build and Astro build. The generated project will use the same contract in Step 23.
3. The site build receives an expected published-state version through a service-owned environment variable. It compares that value with the build-export ETag. If publication advances during the build, a second export version check before switching rejects the stale release. The follow-on outbox event then builds the newer version. This sacrifices one redundant build to avoid publishing a mismatched version.
4. Stage releases under one static-output volume, then rename a prepared relative symlink over `current`. Relative links permit output-volume relocation. Keep the latest two successful release directories, including the current one. Cleanup is after switching and never removes the active target. A process crash can leave a temporary directory for later cleanup but cannot expose partial output.
5. Return only fixed status codes, a fixed-vocabulary one-line log summary, and bounded JSON; never echo subprocess output. The Node adapter maps the fixed response to `BuildTriggerResult`. Publication remains independent of builder availability; the existing dispatcher applies retry policy. No database migration is needed.
6. The existing 60-second outbox lease is too short for a frozen install plus Astro build. Add a conditional lease-renewal operation to the site-build work port and SQLite repository; the Node dispatcher renews every 20 seconds while awaiting the synchronous trigger. A lost lease remains lost, and existing stale-result guards still reject its completion. This extends 21A's dispatch mechanics only where necessary for 21B.

Alternatives rejected: shell command strings from HTTP, building in the source mount, pointing `current` at an in-progress directory, and asynchronous acceptance without a durable callback.

## Risks / Trade-offs

- A build can take long enough to overlap a later publication. Version checks prevent stale release activation; the pending event handles the newer version.
- A container crash may leave temporary work or releases. Startup/retry cleanup reclaims temporary work; successful cleanup retains the current and previous releases.
- The image needs a read-only source mount and writable output/work locations. Step 21C supplies the final topology.

## Migration Plan

Build the pinned image, mount the repository project read-only, mount work/output volumes, and supply separate build and API tokens plus API URL. Step 21C will wire these into private Compose networking. Rollback is switching `current` to the retained previous release or deploying the previous image; no SQL migration is involved.
