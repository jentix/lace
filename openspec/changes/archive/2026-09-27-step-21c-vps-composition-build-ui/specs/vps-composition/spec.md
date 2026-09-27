## Purpose

Defines the deployable single-site VPS topology and recovery behavior that keeps the API, media, builder, and static site available across process restarts.

## ADDED Requirements

### Requirement: VPS composition isolates persistent services
The production deployment SHALL provide API, object storage, builder, static serving, and a dedicated dispatcher with persistent database, object, and release storage. Only the reverse proxy SHALL publish a public port; API, storage, and builder communication SHALL use private networks. Services SHALL have health checks and deterministic startup dependencies.

#### Scenario: Production stack starts
- **WHEN** an operator supplies valid secrets and starts the stack
- **THEN** the public origin serves API, admin, and the current static release while internal endpoints are not published directly

### Requirement: Recovery dispatcher survives API restarts
The production dispatcher SHALL poll durable outbox work independently of the API server, including expired site-build leases, and SHALL not discard publication when the builder is unavailable.

#### Scenario: API restarts during queued work
- **WHEN** the API stops after publication commits and the dedicated dispatcher remains running
- **THEN** the event is dispatched after its debounce or lease expiry without another API request

#### Scenario: Builder is offline
- **WHEN** a publication commits while the builder is offline
- **THEN** publication succeeds, the previous release remains online, and the durable event follows the retry policy
