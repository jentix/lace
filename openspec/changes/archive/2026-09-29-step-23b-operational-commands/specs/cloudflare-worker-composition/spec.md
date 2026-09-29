## ADDED Requirements

### Requirement: Worker readiness requires a current D1 schema
The Worker SHALL verify that the selected D1 database has every checked-in migration before reporting readiness. A missing migration or unavailable migration table SHALL produce an unavailable readiness response without exposing binding values. The Worker SHALL not apply migrations on startup or on a health request.

#### Scenario: Remote deployment has not migrated
- **WHEN** a deployed Worker receives a readiness probe against D1 with a pending migration
- **THEN** readiness returns unavailable while the migration remains pending
