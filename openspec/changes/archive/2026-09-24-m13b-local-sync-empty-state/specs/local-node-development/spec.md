## ADDED Requirements

### Requirement: Local configuration synchronization is an explicit guarded command
The local development workflow SHALL provide `content:sync` against the configured local SQLite database and root project configuration. It SHALL print the complete human-readable plan before any mutation, reject invalid and stale plans with actionable diagnostics, and apply valid plans through the existing guarded atomic operation. `--check` SHALL make no writes and SHALL exit successfully only for a valid no-op plan. Startup and migration SHALL NOT synchronize models.

#### Scenario: First local synchronization
- **WHEN** a contributor runs `content:sync` against a migrated empty local database
- **THEN** the command shows creates before applying them, creates exactly one editable draft for each page, and creates no collection entry

#### Scenario: Repeat or changed configuration
- **WHEN** the command is repeated without a change or run after a safe configuration change
- **THEN** it reports respectively a no-op or the planned change, and applies only the latter

#### Scenario: Check and invalid plan preserve data
- **WHEN** `--check` finds pending operations or any invocation finds an invalid or stale plan
- **THEN** the command exits unsuccessfully with the reason and leaves entries, snapshots, public state, and outbox unchanged

### Requirement: Local sync instructions identify the contributor workflow
The developer guide SHALL describe the local sync command, `--check` semantics, the required running migrated stack, page and collection results, unsafe-change diagnostics, and the separation from API restart and migrations.

#### Scenario: Contributor defines another model
- **WHEN** a contributor edits the root configuration and follows the local guide
- **THEN** they can restart the API, inspect or apply synchronization, and find the resulting page draft or empty collection in Admin
