## ADDED Requirements

### Requirement: Operational failures explain safe recovery
Unsuccessful migration, synchronization, bootstrap and upgrade CLI responses SHALL retain their existing symbolic codes, process exit codes and result/report fields and add nonempty top-level string fields `operation`, `reason` and `nextAction` in JSON mode. `operation` SHALL identify the recognized command or `cli` for unrecognized commands, without echoing arguments. Human output SHALL display the same operation, concrete known cause and recovery action. JSON SHALL remain one object on stdout with no secret-bearing stderr. Success responses SHALL retain their existing shape, including the single intentional bootstrap token reveal.

Known failures SHALL distinguish denied filesystem access, unusable path shape, database locks, missing/outdated schema, invalid target/configuration, pending/blocked sync, completed setup and upgrade input/conflict/busy/recovery failures where trusted evidence exists. Unknown errors SHALL use fixed sanitized fallback text, never arbitrary exception messages, stacks, environment values, subprocess output, passwords or tokens. Recovery SHALL be advice only: target selection, sync atomicity, bootstrap guards and upgrade preservation/recovery semantics SHALL remain unchanged.

#### Scenario: Filesystem failure in either output mode
- **WHEN** migration cannot access its database because of denied permissions or an unusable parent path
- **THEN** it retains OPERATION_FAILED and exit 6, identifies db migrate, explains the cause and advises correcting access or the configured path without revealing that path or creating a database

#### Scenario: Missing or outdated schema
- **WHEN** sync or bootstrap runs against a missing database or an incomplete migration ledger
- **THEN** it retains SCHEMA_OUTDATED and exit 5 and recommends the explicit migration command for the selected target

#### Scenario: Cloudflare infrastructure failure
- **WHEN** a D1 schema check fails because of a network failure or rejected authorization
- **THEN** it reports sanitized infrastructure/authorization guidance with OPERATION_FAILED and exit 6 instead of claiming that migrations are missing

#### Scenario: Invalid target or configuration
- **WHEN** an operator supplies an unsupported target, missing settings or invalid project configuration
- **THEN** human and JSON output identify the operation and corrective argument/setting/configuration action, preserving usage/config codes without supplied values

#### Scenario: Sync cannot be applied
- **WHEN** sync is blocked or check detects pending changes
- **THEN** it preserves the plan, code and exit status and advises reviewing compatible configuration before explicitly applying, with no partial writes

#### Scenario: Bootstrap has completed
- **WHEN** either Node or D1 refuses bootstrap after setup completion
- **THEN** the CLI retains OPERATION_FAILED and exit 6, explains completed setup and advises signing in with the existing administrator, without minting or revealing another token

#### Scenario: Upgrade conflict or interrupted operation
- **WHEN** upgrade review/apply reports conflicts, a busy lock or pending recovery
- **THEN** the existing conflict/recovery information and code remain available with guidance to review conflicts, verify the owner or resume the recorded direction without overwriting user edits

#### Scenario: Unknown failure contains credentials
- **WHEN** an unrecognized exception or failed subprocess includes a sentinel password/token in its message or output
- **THEN** both output modes contain only the sanitized fallback or trusted diagnostic, with no sentinel, stack or raw subprocess output
