## ADDED Requirements

### Requirement: Builds route supports inspection and recovery
The `/builds` screen SHALL load persisted history, show status and target version for each build, and expose a detail view with provider ID, timestamps, requester, reason, and sanitized failure information. It SHALL use the shared admin loading, empty, error, and session recovery states. An administrator SHALL be able to request a build and retry a failed build; other roles SHALL see read-only information.

#### Scenario: Failed build
- **WHEN** an administrator views a failed build
- **THEN** the screen presents its sanitized error and a retry action whose receipt refreshes history

#### Scenario: Restricted role
- **WHEN** an editor or viewer opens `/builds`
- **THEN** persisted builds remain visible but request and retry controls are absent

#### Scenario: Empty history
- **WHEN** no build has been claimed yet
- **THEN** the screen shows an actionable empty state for administrators and a read-only empty state for other roles
