## Why

Roadmap Step 21, Session 21A (Site-build dispatch). Publication already writes a coalesced `site.build.requested` outbox event, but Node has no site-build dispatcher, persisted build lifecycle, or manual request and retry API. A successful publication therefore cannot yet produce observable, recoverable build work.

## What Changes

- Extend generic outbox dispatch with an atomic site-build claim that creates a `site_builds` row at the claimed target published-state version. Preserve the 5-second sliding debounce; a publication after claim creates the next pending event.
- Centralize the architecture's 60-second lease, 5-second base full-jitter backoff, 15-minute cap, and 8 total attempts. Recover expired claims and prevent stale workers from changing a newer claim.
- Define build-trigger results as accepted with a provider ID, synchronously succeeded, or failed. Persist `pending`, `running`, `succeeded`, and `failed` states and lifecycle timestamps; keep sanitized errors and terminal failures visible.
- **BREAKING:** Publication stops calling the trigger directly. Its build outcome reports durable queueing instead of immediate provider acceptance or failure; the existing outbox remains the source of recovery.
- Add administrator-only manual build request and retry commands and HTTP endpoints. Both enqueue through the same coalescing outbox path and preserve publication success when the trigger is unavailable.
- Add focused concurrency, failure, recovery, authorization, and contract tests.

## Capabilities

### New Capabilities

- `site-build-dispatch`: Build request, trigger outcome, persisted lifecycle, manual request, and retry behavior.

### Modified Capabilities

- `outbox-dispatch`: Fix the dispatch defaults and require atomic site-build claim/recovery semantics.
- `content-use-cases`: Replace direct post-publication triggering with a truthful durable-queue outcome while preserving publication success and idempotency.
- `application-ports-and-commands`: Expose portable build dispatch and administrative build commands without database or transport types.
- `node-content-repositories`: Persist atomic Node/SQLite build claim and lifecycle transitions.
- `rest-contracts`: Define administrator build request and retry request/response contracts.
- `hono-app-factory`: Add authenticated administrator build request and retry routes.

## Impact

- Architecture: §§9.8, 9.9, and 15; ADR 0004. This change implements their existing invariants without changing them. It depends on the existing outbox schema, publication coalescing, actor boundary, and shared REST validation.
- Code: `packages/application`, `packages/platform-node`, `packages/contracts`, `packages/server`, `apps/api` composition/tests, and publication messaging in `apps/admin`; `packages/db` only if an additive migration is needed to enforce the selected claim model. No new external dependency is expected.
- External behavior: administrator clients can request a build or retry a failed build; each request enters the durable outbox, and claimed requests enter build history with target version, state, provider ID, timestamps, and sanitized failure. Publication remains successful if triggering fails.
- Non-goals: the fixed-command builder implementation (21B), production recovery service, Compose wiring, `/builds` history UI, and release integration test (21C); Cloudflare adapter (22B/22C). The portable contracts must permit later runtime adapters.
