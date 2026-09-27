## ADDED Requirements

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
