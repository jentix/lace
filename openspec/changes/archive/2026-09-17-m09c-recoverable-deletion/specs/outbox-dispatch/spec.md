## Purpose

Defines durable asynchronous event dispatch behavior so recoverable background
work has exclusive claims, bounded retries, and observable terminal outcomes.

## ADDED Requirements

### Requirement: Durable events have exclusive recoverable leases
The system SHALL claim only available, unfinished events through an atomic
conditional operation. Each claim SHALL create a 60-second lease that excludes
other dispatchers until it completes or expires. A later claim SHALL recover
expired unfinished work without treating it as a completed event, and a stale
lease completion SHALL not alter a subsequently recovered claim.

#### Scenario: Concurrent dispatchers claim one event
- **WHEN** two dispatchers concurrently claim an available event
- **THEN** exactly one receives an active lease and the other cannot complete
  or process that event through the first lease

#### Scenario: A crashed dispatcher lease expires
- **WHEN** a dispatcher does not complete its 60-second lease
- **THEN** a later dispatcher can claim the unfinished event and complete it
  without duplicating its durable completion record

### Requirement: Retryable dispatch failures are bounded and visible
The system SHALL record each failed attempt and reschedule retriable work using
bounded exponential backoff with jitter. A finite configured maximum attempt
count SHALL stop automatic retries; the terminal event outcome SHALL retain a
sanitized failure classification and attempt count for operator diagnosis. A
successful completion SHALL prevent all later automatic claims.

#### Scenario: A transient failure is retried
- **WHEN** a dispatcher reports a retriable event failure before the configured
  maximum attempt count
- **THEN** the event remains unfinished, its attempt count increases once, and
  its next availability is delayed by the configured bounded jittered backoff

#### Scenario: Attempts reach the terminal limit
- **WHEN** an event fails at its configured maximum attempt count
- **THEN** it is not automatically claimed again and its durable terminal
  outcome exposes only the sanitized failure classification and attempt count
