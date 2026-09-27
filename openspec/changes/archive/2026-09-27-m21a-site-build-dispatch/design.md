## Context

See proposal.md — Why. Publication and config sync already increment `published_state.version` and coalesce an outbox event in the Node repository. The schema already has nullable leases, a partial unique index for one unlocked pending build event, and `site_builds`, but no build dispatcher uses them. The generic lease/retry ports and Node media dispatcher provide a pattern. `defaultDispatcherRetryPolicy` currently starts at 1 second, contrary to architecture §9.8's 5-second site-build default. `SiteBuildTrigger` currently returns an `accepted` boolean, and Node composition supplies a no-op trigger.

## Goals / Non-Goals

**Goals:** Make a claimed build durable and observable, keep publication independent from triggering, and provide a portable contract that 21B and 22B can implement.

**Non-Goals:** Run Astro, authenticate a builder callback, deploy the recovery process, or render build history in Admin. Those belong to 21B/21C.

## Decisions

### One event identifies one build

Use the outbox event ID as the `site_builds.id`. The Node repository claims and inserts the build row in the same SQLite transaction. `INSERT ... ON CONFLICT DO NOTHING` on a recovered lease reuses the row and never rewrites `target_version`. This avoids a second event-to-build mapping column and an unnecessary migration. The event payload carries `targetVersion`, `publishedSnapshotId`, `reason`, `requestedBy`, `requestedAt`, and optional `retryOfBuildId`; coalescing updates these to the latest request while preserving a retry source when later publication arrives. Existing events without these keys are handled as malformed terminal work with a sanitized error instead of guessing actor or version.

Alternative rejected: create `site_builds` during every publication. It would produce build-history rows for requests that are deliberately coalesced and contradict the architecture's claim-time row creation.

### Keep the claim target fixed

The existing partial unique index allows one unlocked pending event and a separate claimed event. Publication and manual commands use one transactional enqueue helper, with `INSERT OR IGNORE` plus guarded update of only the unlocked row. Debounce uses a centralized `SITE_BUILD_DEBOUNCE_MS = 5_000`. Claim reads the event payload, acquires a conditional lease, and inserts the build row in the same transaction. A later publication creates another pending event. A recovered lease uses the existing build row.

Alternative rejected: update the claimed event to the newest version. A running builder could then deploy a version different from its persisted target.

### Trigger and completion contract

Replace the boolean trigger result with a discriminated result: `{status: 'accepted', providerBuildId}`, `{status: 'succeeded'}`, or `{status: 'failed', reason}`. Publication no longer invokes it directly; the publication response changes to `queued` with target version (or `not-dispatched` on replay). The site-build dispatcher validates the claimed payload, calls the trigger outside the database transaction, and records the result through lease-guarded repository commands. Accepted means the provider has taken responsibility; the event is processed and the build is `running`, with provider ID and `started_at`. Synchronous success processes the event and records `succeeded` plus `completed_at`. A failure keeps the row `pending` until the retry limit, then records `failed` and `completed_at`. A separate portable completion command may finish an accepted build by ID and provider ID; 21B supplies the authenticated inbound path. Any completion is idempotent for an identical terminal result and rejects a conflicting terminal result.

The trigger input carries only build ID and target version at this boundary, plus fixed metadata needed for correlation; it never carries a caller-selected command, path, environment, or arbitrary arguments. The Node no-op trigger reports a sanitized unavailable failure. This permits 21A tests without starting a builder.

Alternative rejected: treat acceptance as successful deployment. Acceptance only proves dispatch, so it cannot mark the static release as succeeded.

### Retry and failure handling

Keep lease duration centralized at 60 seconds. Add a named site-build policy with a 5-second base, 15-minute cap, and eight attempts; retain the media policy unless its accepted behavior is deliberately changed. Inject clock and random sample into the dispatcher for deterministic tests. All event and build mutations check the current lease token in one transaction. A trigger exception maps to a fixed `trigger_unavailable` category; provider-reported failures map to an allowlisted sanitized category. Never persist raw exception messages, URLs, secrets, or full environment data. An expired lease may repeat a remote trigger, so providers must deduplicate by stable build ID when 21B/22C implement them.

Alternative rejected: catch a trigger failure inside publication. Publication commits before dispatch, and the durable outbox is the recovery source.

### Administrator commands and HTTP

Add application commands requiring the existing admin permission boundary. Manual request reads the authoritative current published-state version in the enqueue transaction, and retry first checks that the cited build is failed. Both return `{eventId, targetVersion, coalesced}`. Retry uses the current version, not the failed row's possibly stale target. Use strict empty JSON bodies on `POST /api/v1/admin/builds` and `POST /api/v1/admin/builds/:buildId/retry`, validated by shared Valibot contracts and included in OpenAPI. The response uses `202 Accepted`; an invalid retry target uses the shared not-found or invalid-state error envelope. The route passes the actor into application commands and does not compare role strings itself.

Alternative rejected: expose a trigger URL or command in the request. It would create a public path to arbitrary builder actions and violate ADR 0004.

### Composition and verification

`packages/application` owns portable types, use cases, and timing; `packages/platform-node` owns SQLite transactions and the Node dispatcher; `packages/contracts` owns DTO validation; `packages/server` owns routes; `apps/api` wires existing Node capabilities. The 21A composition provides a callable dispatch pass, while the independent periodic recovery service is 21C. Existing `site_builds` columns and the outbox partial index suffice, so no migration is planned. Node contract tests prove atomic claim, expired-lease reuse, publication race, coalescing, terminal retry, and stale completion; HTTP tests prove authorization and strict input rejection. Root typecheck, Oxlint, Oxfmt, and strict OpenSpec validation gate completion.

## Risks / Trade-offs

- [A process dies after a remote trigger accepts but before the local result commits] → Reclaim the lease and resend the stable build ID; the 21B/22C trigger adapter must deduplicate that ID.
- [Accepted work never calls back] → Keep `running` visible and allow operator diagnosis; 21B defines the authenticated result path and timeout policy before production deployment.
- [A failed build is retried after content advances] → Retry targets the latest version and retains `retryOfBuildId` in the durable event payload.
- [Provider error text contains sensitive data] → Map failures to fixed categories before storage or HTTP serialization.

## Migration Plan

No schema migration is expected. Deploy the API contracts and dispatcher together, then deploy the 21B trigger and 21C recovery process. Existing pending build events without new provenance fields remain recoverable only if their payload can be validated and safely defaulted from durable data; otherwise mark them terminal with a sanitized malformed-event category. Rollback leaves outbox and build rows intact; the previous API simply does not process the new event type.
