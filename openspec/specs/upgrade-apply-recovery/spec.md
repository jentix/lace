# Upgrade Apply and Recovery

## Purpose

Apply reviewed generated-project upgrades while preserving user work, exposing conflicts, and allowing interrupted filesystem operations to be resumed or explicitly rolled back.

## Requirements

### Requirement: Explicit apply protects ownership and commits the manifest last
An explicit apply SHALL validate the installed manifest, pristine target template, current file state, and any target migration metadata before changing working files. It SHALL recheck expected managed-file hashes before mutation, use temporary files and atomic renames for replacements/additions and manifest publication, and preserve executable permission bits on replaced existing files. It SHALL persist verified before-images, target bytes, old and new manifests, and operation identity before the first working-file mutation. The new manifest SHALL be written only after all planned conflict-free managed-file changes are complete. Existing user ownership SHALL remain user ownership even when the target inventory attempts to reclassify that path. Files under `site/**`, `lace.config.ts`, preserved local edits, and unrelated untracked files SHALL remain untouched. The target template SHALL remain unchanged.

#### Scenario: Unchanged generated project upgrades
- **WHEN** baseline managed files are unmodified and the target changes dependencies/images, adds a managed file and removes an obsolete managed file
- **THEN** apply installs the target managed bytes, performs the addition/removal, commits the new manifest last, and retains the pre-apply bytes and ownership baseline for recovery

#### Scenario: User source and existing user ownership
- **WHEN** site/config source contains local changes or a target attempts to manage an existing user-owned path
- **THEN** apply leaves those contents unchanged and the committed manifest preserves their user ownership

#### Scenario: Locally edited unchanged template file
- **WHEN** a managed file has local edits but its target template hash equals its baseline hash
- **THEN** apply preserves the local bytes and records the template hash rather than blessing the local edit as a pristine baseline

#### Scenario: Input changes after inspection
- **WHEN** a planned managed file, installed manifest or target input changes before its guarded mutation
- **THEN** apply refuses to overwrite unexpected bytes, returns a failure with recovery instructions, and does not publish a completed manifest

### Requirement: Conflicts produce reviewable artifacts without advancing the installation
If the fresh plan contains any conflict, explicit apply SHALL leave all working managed files and the installed manifest unchanged and SHALL produce reviewable artifacts under `.lace/conflicts/<target-version>/`. Artifacts SHALL identify each affected path and reason, record baseline/current/target hashes, include the plan's diff and exact proposed managed bytes where present, and explicitly represent proposed deletion or ownership transition when no managed bytes exist. Artifact publication SHALL reject unsafe paths and SHALL NOT overwrite operator-edited artifacts. Identical repeated conflict requests SHALL be safe. A conflict result SHALL return exit 2 and identify artifact paths in human and JSON output. The operator SHALL resolve working files explicitly and rerun planning/apply; the CLI SHALL NOT choose a new template as automatic conflict resolution.

#### Scenario: Modified Compose with otherwise safe changes
- **WHEN** Compose is locally modified and conflicts while another managed file has a safe replacement
- **THEN** apply writes proposed Compose bytes and its diff under the versioned conflict directory, changes neither working file nor manifest, and reports the blocking conflict

#### Scenario: Deletion or ownership conflict
- **WHEN** the target removes a locally edited managed file or transfers a managed path to user ownership
- **THEN** artifacts describe the proposed removal or ownership transfer and the current file remains untouched

#### Scenario: Artifact was edited for review
- **WHEN** an operator changes a previously published conflict artifact and invokes apply again
- **THEN** the command preserves the edited artifact and reports the collision instead of overwriting it

### Requirement: Interrupted apply is detectable and safely repeatable
The CLI SHALL detect an unfinished recorded operation before starting an unrelated upgrade. Repeating apply with the same verified target SHALL resume from the persisted operation using per-path old/new hash guards, including additions and removals. Recovery SHALL validate the journal and saved bytes, refuse unsupported or corrupted metadata, and reject a different target or unexpected working edits without overwriting them. A crash after manifest publication but before operation completion recording SHALL be recoverable as a completed apply. Repeated successful apply SHALL not create a new rollback baseline for a no-op operation. An interrupted rollback SHALL remain a rollback operation until it is resumed. Human/JSON results SHALL distinguish applied, already-current, resumed, pending-recovery and failed outcomes and identify the relevant recovery path.

#### Scenario: Process stops after replacing a file
- **WHEN** the process terminates after one replacement and before manifest publication
- **THEN** the old manifest remains installed, the interruption is detectable, and matching apply resumes remaining changes without needing the old external template

#### Scenario: Process stops after manifest publication
- **WHEN** the new manifest was committed but the completion record was not written
- **THEN** repeating matching apply verifies installed bytes and safely records completion without overwriting the saved old manifest

#### Scenario: Target or project diverges during recovery
- **WHEN** the requested target differs from the saved target or a journaled working file matches neither its pre-apply nor its planned post-apply state
- **THEN** recovery fails with actionable diagnostics and preserves the unexpected bytes and recovery records

#### Scenario: Repeated completed apply
- **WHEN** a successful apply is repeated with the same target and no new changes
- **THEN** it reports already-current, preserves the original rollback baseline, and leaves working files byte-identical

### Requirement: Rollback restores only the latest recorded filesystem upgrade
`lace upgrade --rollback [--project <dir>] [--json]` SHALL restore the most recent active or completed upgrade's exact pre-apply bytes, missing-file states, permission bits and original manifest using retained recovery metadata, without requiring the original template directory. It SHALL validate all affected paths before restoration and preserve subsequent unexpected edits by refusing a conflicting rollback. Restorations SHALL be atomic per file and the original manifest SHALL be restored last. Interrupted rollback SHALL be resumable by repeating rollback; completed rollback SHALL be safe to repeat. Rollback SHALL NOT touch user-owned files, runtime databases, uploaded objects, or run migrations. With no recorded operation, rollback SHALL fail with an actionable input error.

#### Scenario: Rollback a completed or interrupted upgrade
- **WHEN** the operator requests rollback and affected files match saved pre/post states
- **THEN** replaced/deleted files regain their saved bytes and modes, newly created files are removed, and the original manifest is restored last

#### Scenario: Later user edit blocks rollback
- **WHEN** an affected managed file has been edited after apply to bytes outside the saved pre/post states
- **THEN** rollback reports that path before restoring any working file and preserves the user edit

#### Scenario: Repeat interrupted rollback
- **WHEN** rollback terminates after restoring some files
- **THEN** the next rollback continues safely from the mixed restored/upgraded state and completes the original manifest restoration

### Requirement: Mutation is serialized and recovery paths remain safe
The CLI SHALL allow only one apply/rollback operation at a time per physical project. Another live invocation SHALL fail without modifying working files or the operation's metadata. Dead-owner recovery SHALL occur only when the CLI can establish that the previous local owner is no longer running; ambiguous ownership SHALL require documented operator recovery. Manifest, working-file, artifact, staging and journal paths SHALL reject traversal, symlink components, nonregular files and case aliases. Recovery metadata SHALL NOT authorize mutation of user-owned or reserved paths. Paths whose file/directory shapes cannot support the selected operation SHALL be rejected before working-file mutation. Dry runs SHALL remain lock-free and read-only.

#### Scenario: Two operators apply concurrently
- **WHEN** one process holds the project mutation lock and another invokes apply or rollback
- **THEN** the second reports a busy operation and performs no working-file or journal writes

#### Scenario: Unsafe metadata or destination
- **WHEN** a conflict/journal path contains a symlink or a journal lists `site/`, `.lace` traversal or a user-owned mutation
- **THEN** the operation fails before reading through or writing to the unsafe destination

### Requirement: Migration guidance is version-associated and never executed
The target template SHALL optionally supply `.lace/upgrade-instructions.json` with schema version 1, its exact template version, and separate arrays of plain database and configuration instruction strings. Supplied metadata SHALL be strictly validated before apply; a version mismatch or malformed document SHALL fail before working-file mutation. Human and JSON upgrade review/apply results SHALL report the target version and its supplied instructions, or explicitly state that no version-specific instructions were supplied. Applied operations SHALL retain that metadata for recovery reports. Output SHALL also remind the operator that database migrations and configuration synchronization are explicit deployment steps. The CLI SHALL never execute instruction text, access a database, load `lace.config.ts`, obtain runtime credentials, install dependencies or make a remote request during upgrade or rollback.

#### Scenario: Target requires database/config changes
- **WHEN** a pristine target supplies valid migration instructions for its version
- **THEN** review and apply expose the instructions and target version without executing any command or changing a runtime database

#### Scenario: No supplied instructions
- **WHEN** an older compatible target lacks the optional instructions file
- **THEN** upgrade remains supported and reports that version-specific instructions were not supplied together with the explicit-deployment reminder

#### Scenario: Instruction metadata belongs to another version
- **WHEN** instruction metadata names a version different from the target manifest
- **THEN** apply fails before publishing artifacts, journal or working-file changes
