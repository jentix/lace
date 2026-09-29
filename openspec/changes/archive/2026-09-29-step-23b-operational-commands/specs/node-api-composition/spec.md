## MODIFIED Requirements

### Requirement: Node readiness checks local prerequisites cheaply

The Node runtime SHALL report readiness from already-initialized configuration, a bounded SQLite availability check, and confirmation that every checked-in migration is installed. It SHALL not perform object-storage, build-trigger, or external network work for each readiness probe. A failed configuration, unavailable SQLite dependency, or outdated schema SHALL make readiness fail while liveness remains available. Startup SHALL report outdated schema without applying migrations.

#### Scenario: SQLite becomes unavailable after startup
- **WHEN** the Node readiness check cannot execute its bounded database probe
- **THEN** readiness reports unavailable and liveness continues to report the running HTTP process

#### Scenario: Schema is outdated
- **WHEN** a Node API opens a database missing a checked-in migration
- **THEN** startup identifies the pending migration and readiness does not report ready until an explicit migration command applies it
