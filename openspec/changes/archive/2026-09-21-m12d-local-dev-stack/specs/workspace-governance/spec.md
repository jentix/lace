## ADDED Requirements

### Requirement: Local development operations have stable root commands

The workspace SHALL expose documented root commands to start the Node local
development stack, stop it, view its logs, run its smoke check, and explicitly
reset its named local data. The start, stop, log, and smoke commands SHALL
delegate to the same declared local topology rather than duplicating service
configuration. The reset command SHALL require an explicit destructive command
name and SHALL not run as part of ordinary start, stop, test, build, or quality
commands.

#### Scenario: A contributor uses the standard local lifecycle
- **WHEN** a contributor invokes the documented root start, stop, log, or smoke
command
- **THEN** the command targets the same declared local development topology and
reports a clear success or failure outcome

#### Scenario: Ordinary development commands are run
- **WHEN** a contributor runs an ordinary start, stop, test, build, lint,
typecheck, or format command
- **THEN** no local database or object-store data are deleted implicitly
