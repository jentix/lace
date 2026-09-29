# operational-cli Specification

## Purpose

Defines the explicit operator commands that prepare a Lace database and first administrator on Node or Cloudflare without exposing credentials or selecting a remote installation by accident.

## Requirements

### Requirement: Commands select an explicit, validated environment
The `lace` CLI SHALL provide `db migrate`, `content sync [--check]`, and `auth bootstrap` for named `node` and `cloudflare` targets. An omitted target SHALL select only a local Node installation. A remote Cloudflare target SHALL require an explicit `--target cloudflare-remote` option and required account, database, and API credentials; local Cloudflare SHALL require `--target cloudflare-local`. Validation errors SHALL identify setting names but SHALL not disclose supplied values. No command SHALL fall back from a failed local target to a remote target.

#### Scenario: Default command is local
- **WHEN** an operator omits `--target` and provides a local SQLite path
- **THEN** the command accesses only that Node database

#### Scenario: Remote settings are incomplete
- **WHEN** an operator selects `cloudflare-remote` without a required credential or database identifier
- **THEN** the command fails before mutation and names only the missing setting

### Requirement: Migration is an explicit deployment command
`lace db migrate` SHALL apply the checked-in forward migrations to the selected database, report installed versions, and be safe to repeat. It SHALL not infer a production target from local defaults. The API SHALL not run migrations during startup.

#### Scenario: Fresh installation
- **WHEN** migration runs against a fresh selected database
- **THEN** all checked-in migrations are installed and a repeat run reports them without reapplying them

### Requirement: Sync uses the accepted guarded synchronization policy
`lace content sync` SHALL use the existing application synchronization planner and guarded apply operation for Node and Cloudflare. `--check` SHALL never write; it SHALL return success only when the stored identities match the normalized configuration, and SHALL return a distinct nonzero exit code when changes are pending or invalid. A normal sync SHALL report operations and refuse incompatible changes without partial application.

#### Scenario: CI check finds a pending change
- **WHEN** `content sync --check` sees a valid pending plan
- **THEN** it reports the plan, exits with the pending-change code, and leaves persistent state unchanged

#### Scenario: Incompatible change
- **WHEN** a model change is incompatible with stored entries
- **THEN** sync reports the affected model and leaves the database unchanged

### Requirement: Bootstrap reveals one setup token safely
`lace auth bootstrap` SHALL use the selected target's existing setup service to mint a bounded one-time setup token while setup is incomplete. It SHALL emit the plaintext token only in the successful command response, never in an error or log, and SHALL refuse to mint after setup completes. It SHALL work non-interactively in CI.

#### Scenario: Initial setup
- **WHEN** a migrated installation has not completed setup
- **THEN** bootstrap prints one setup token and its expiry for the setup-admin flow

#### Scenario: Setup complete
- **WHEN** setup has completed
- **THEN** bootstrap returns a nonzero status and prints no credential

### Requirement: Operator output is deterministic and parseable
Every command SHALL support `--json` with one JSON result or error object on stdout, stable symbolic error codes and stable process exit codes. Human output SHALL be actionable. Non-interactive execution SHALL never prompt and SHALL fail closed if required target selection or configuration is absent.

#### Scenario: Automation receives a validation error
- **WHEN** a CI job invokes a command with invalid settings and `--json`
- **THEN** stdout contains one parseable error object with a stable code, stderr contains no secret, and the process exits nonzero
