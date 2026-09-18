## Why

Sessions 9A and 9B can atomically mark unreferenced media as `deleting` and
record a `media.delete.requested` outbox event, but no worker claims that work
or reconciles the object store with its metadata. Step 9, Session 9C completes
the lifecycle so storage outages remain observable and retryable rather than
leaving indefinitely deleting rows or dangling references.

## What Changes

- Implement roadmap Step 9, Session 9C: recoverable media deletion through a
  generic durable outbox dispatcher.
- Add atomic conditional outbox claims, 60-second leases, recovery of expired
  leases, bounded exponential retry with jitter, and durable terminal-failure
  visibility for `media.delete.requested` work.
- Dispatch a claimed media-deletion event by idempotently removing its private
  object, then atomically deleting only its still-`deleting`, unreferenced
  metadata row; terminal object-store failures preserve a `delete_failed` row
  with a sanitized error.
- Expose the existing authorized retry lifecycle as an admin HTTP command, and
  wire the dispatcher into the Node runtime with a bounded background loop and
  clean shutdown.
- Strengthen Node persistence and portable doubles so a draft save cannot add
  a deleting item, and a delete/retry transition cannot succeed if a reference
  commits first.

## Capabilities

### New Capabilities

- `outbox-dispatch`: Durable generic leasing, retry, recovery, and terminal
  outcome behavior for asynchronous events.

### Modified Capabilities

- `application-ports-and-commands`: Define dispatcher and media-finalization
  command boundaries required by recoverable deletion.
- `media-use-cases`: Define recoverable deletion dispatch semantics and the
  authorized retry outcome.
- `node-content-repositories`: Require atomic outbox/media completion and
  reference-race protection in Node SQLite persistence.
- `hono-app-factory`: Expose an authorization-aware admin retry-deletion route.
- `node-api-composition`: Start and stop the bounded Node deletion dispatcher
  without weakening startup/readiness behavior.

## Impact

- Affected packages: `@lacecms/application`, `@lacecms/platform-node`,
  `@lacecms/server`, `@lacecms/test-utils`, and `apps/api`; it uses the
  existing sanitized diagnostic columns and introduces no binary SQL storage.
- Depends on the media states, reference projection, and transactional
  `media.delete.requested` enqueue delivered in Sessions 5C, 9A, and 9B.
- Follows architecture §§4.5–4.7, §6, §9.7, and §12, plus roadmap Step 9C.
  Cloudflare/R2 dispatch, site-build dispatch, object lifecycle policies, and
  media restoration after a successful object deletion are out of scope.
