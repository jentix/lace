## ADDED Requirements

### Requirement: Explicit Node migration prepares file-backed database parents
Explicit Node migration SHALL recursively create missing parent directories of the selected file-backed SQLite path before opening the database. Existing directories and data SHALL be preserved; a repeated migration SHALL report the same installed versions without reapplying completed migrations. The `:memory:` database SHALL require no filesystem directory preparation. Directory creation failure SHALL stop migration before opening or mutating the selected database and SHALL remain visible to the caller. This preparation SHALL NOT introduce automatic API startup migrations or alter shared SQLite/D1 migration SQL.

#### Scenario: Fresh nested file path
- **WHEN** explicit Node migration selects a SQLite file whose parent and intermediate directories do not exist
- **THEN** those directories are created and all checked-in forward migrations are installed at the selected path

#### Scenario: Relative path uses the operator working directory
- **WHEN** explicit Node migration selects a relative nested SQLite path
- **THEN** the directories and database are created relative to the invoking process working directory

#### Scenario: Repeated migration preserves existing data
- **WHEN** explicit Node migration runs again on a migrated database containing stored application data and neighbouring files
- **THEN** it reports the installed versions without duplicate ledger entries and preserves the application data and neighbouring files

#### Scenario: In-memory migration avoids filesystem preparation
- **WHEN** explicit Node migration selects `:memory:`
- **THEN** it installs and reports migrations without creating or preparing a filesystem directory or database file

#### Scenario: Parent directory cannot be created
- **WHEN** a parent component is an existing file or filesystem permissions reject directory creation
- **THEN** migration fails before opening the selected database, leaves existing data intact and reports the failure to its caller

#### Scenario: Concurrent parent preparation
- **WHEN** another process creates a required directory during explicit migration's directory preparation
- **THEN** preparation accepts the existing directory without deleting or replacing it, while database migration retains its existing locking behavior
