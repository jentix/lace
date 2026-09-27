## ADDED Requirements

### Requirement: Build commands and trigger outcomes remain portable
The application SHALL expose actor-checked build request/retry commands and portable ports for claiming build work, recording trigger outcomes, and completing asynchronously accepted builds. Trigger outcomes SHALL distinguish accepted with provider ID, synchronously succeeded, and failed without exposing HTTP or database row types. Publication result and durable build-dispatch status SHALL remain independent.

#### Scenario: Publication trigger is unavailable
- **WHEN** publication commits and subsequent site-build triggering is unavailable
- **THEN** publication remains successful and its durable build event remains recoverable

#### Scenario: Runtime reports a synchronous trigger result
- **WHEN** a runtime trigger returns synchronous success
- **THEN** the application can persist a succeeded build without requiring a provider ID
