# site-build-dispatch Specification

## Purpose

Defines durable site-build requests, observable build lifecycles, and administrator recovery of failed builds across supported runtimes.

## Requirements

### Requirement: Site-build requests coalesce before claim
The system SHALL enqueue publication, manual, and retry requests through the same durable `site.build.requested` outbox event. Requests before claim SHALL use a 5-second debounce from the most recent request and target the latest published-state version. A request after claim SHALL create or coalesce the next pending event without changing the claimed target.

#### Scenario: Rapid publications coalesce
- **WHEN** several publications commit within five seconds before a build event is claimed
- **THEN** one pending event targets the newest published-state version and becomes available five seconds after the last request

#### Scenario: Publication follows a claim
- **WHEN** a publication commits after an event is claimed
- **THEN** its version is retained in a distinct pending event and the claimed build's target remains fixed

### Requirement: Claimed builds have a durable lifecycle
The system SHALL atomically claim an event and create exactly one build row for that event with its target version, reason, requester, and request time. An expired lease SHALL recover the same build row. Builds SHALL transition through `pending`, `running`, and terminal `succeeded` or `failed` with applicable start/completion times. Accepted asynchronous triggers SHALL record a provider build ID; synchronous success SHALL complete the build; failed triggers SHALL be retried with sanitized errors and SHALL become terminal after eight total attempts. Stale lease results SHALL not change a recovered claim.

#### Scenario: Trigger accepts asynchronous work
- **WHEN** a claimed trigger accepts a build and returns a provider ID
- **THEN** the build becomes running, records the provider ID and start time, and awaits a later terminal result

#### Scenario: Trigger finishes synchronously
- **WHEN** a claimed trigger reports synchronous success
- **THEN** the build becomes succeeded with completion time and the event cannot be claimed again

#### Scenario: Trigger fails before terminal attempt
- **WHEN** a trigger fails while retry attempts remain
- **THEN** the event is rescheduled and the same build row remains pending with sanitized failure information

#### Scenario: Failure reaches attempt limit
- **WHEN** the eighth attempt fails
- **THEN** the event stops being claimable and the build becomes failed with completion time and sanitized error

### Requirement: Administrators may request and retry builds
Only an administrator SHALL be able to request a build or retry a failed build. These commands SHALL return durable queue receipt information, including the current target version and whether work coalesced. Retry SHALL use the latest published-state version and record the failed build as its source; retrying a missing or non-failed build SHALL be rejected without enqueueing work. No command SHALL expose a shell command, filesystem path, or environment override.

#### Scenario: Administrator requests a build
- **WHEN** an administrator requests a build while another unclaimed event exists
- **THEN** the request coalesces into that event and returns its current target version

#### Scenario: Administrator retries a failed build after newer publication
- **WHEN** an administrator retries a failed build after the published-state version has advanced
- **THEN** the queued target is the current version and the retry source identifies the failed build

#### Scenario: Restricted actor requests a build
- **WHEN** an editor, viewer, or anonymous caller requests or retries a build
- **THEN** authorization is denied and no event or build is changed

### Requirement: Node dispatch invokes the private fixed-command builder
The Node/VPS site-build trigger SHALL send only the build ID and target version to the private builder with the dedicated secret, map its synchronous success or sanitized failure to the existing durable build lifecycle, and treat unavailable or malformed builder responses as retryable trigger failure. Cloudflare SHALL use its own trigger adapter under the same application port.

#### Scenario: Builder succeeds
- **WHEN** the builder reports success for a dispatched build
- **THEN** the dispatcher may record synchronous success for that build

#### Scenario: Builder is unavailable
- **WHEN** the builder cannot be reached or returns an invalid response
- **THEN** the dispatcher records a sanitized failure and leaves publication committed

### Requirement: Long synchronous builds retain their claim
While the Node/VPS builder call is in progress, the dispatcher SHALL renew its existing 60-second lease before expiry. Renewal SHALL be conditional on the same claim still owning the event; a lost claim SHALL not be revived or allowed to record a stale result.

#### Scenario: Build exceeds one lease interval
- **WHEN** a builder call lasts longer than 60 seconds and lease renewals succeed
- **THEN** its synchronous result can still be recorded against the original build row

#### Scenario: Claim is lost
- **WHEN** a renewal finds the event claimed by another worker or already completed
- **THEN** the stale dispatcher cannot mark that build as succeeded
