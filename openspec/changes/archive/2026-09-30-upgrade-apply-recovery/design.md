## Context

See `proposal.md` for motivation and authority references. `upgrade.ts` currently reads schema-1 inventories, verifies target hashes, classifies sorted ownership decisions, and generates whole-file diffs. `upgrade-input.ts` validates relative inventory paths and uses ancestor checks plus no-follow file opens. `upgrade-command.ts` rejects `--apply`; the CLI already has non-interactive JSON and stable exit codes. The generator records only managed baseline hashes, so hashes alone cannot restore old bytes after replacement. Tests import built CLI output, and CLI integration tests already generate Node/Cloudflare fixture pairs.

## Goals / Non-Goals

**Goals:** Keep schema-1 ownership manifests compatible; make process interruption observable; retain before-images for precise filesystem rollback; apply the same behavior to generated Node and Cloudflare projects; reject unexpected local edits at every recovery boundary.

**Non-Goals:** A globally atomic filesystem transaction or a guarantee against filesystem/hardware corruption; hostile concurrent filesystem mutation by a privileged process; database/data rollback; reconstructing old bytes from hashes; executing migration instructions; changing runtime package boundaries.

## Decisions

### 1. Keep operations inside the CLI and reuse planning

Add operation/recovery and instruction-validation modules alongside `upgrade.ts`. Keep `planUpgrade` and its deterministic `UpgradePlan` contract; add command-envelope instruction/recovery data rather than changing `dryRun: true` into a mutation result. The command dispatcher selects review, apply or rollback. Export operation types/helpers consistently with existing CLI exports. `bin.ts` maps new symbolic operation errors to existing exit 4/6 and retains exactly one JSON envelope.

The existing planner remains the ownership authority; operation code captures and rechecks its inspected state instead of maintaining a second three-way decision algorithm. Extend input helpers for safe metadata paths and destination inspection. No application, domain, platform or generator dependency changes are needed: the host CLI manages local source for either runtime.

Alternative: put filesystem upgrade policy into an application port. Rejected because this operation concerns generated source ownership, not runtime content or deployment persistence.

### 2. Gate working-file changes on a fully conflict-free plan

Conflicted apply only publishes conflict artifacts; it does not perform the otherwise-safe subset or advance the manifest. This avoids labeling partially accepted changes as a completed target installation and avoids complicated mixed-version baselines. Operator resolution means restoring a conflicted managed file to its old baseline, accepting exact target managed bytes, or explicitly correcting the schema-valid ownership inventory. Re-plan before apply. Managed-to-user transitions must be resolved explicitly; do not infer consent from unchanged contents.

Build the committed inventory from the target inventory with existing user ownership retained, including user paths absent from the target. For preserved managed local edits keep target/baseline template hashes, never hash the local edit into a new pristine baseline. The manifest version names the target even if unrelated local edits remain preserved. Verify all `current` paths before manifest commit along with actually mutated files.

Use `.lace/conflicts/<version>/proposed/<path>` for proposed managed bytes, `diffs/<path>.diff` for diffs, and `index.json` for sorted decisions, hashes and removal/ownership records. Publish a staged conflict bundle by rename. If an identical bundle exists, reuse it; if any existing artifact differs, refuse overwrite and explain how to preserve/move the previous review bundle. Target version syntax already excludes separators. No implicit merge or force flag.

Alternative: safe-subset apply with immediate target-manifest replacement. Rejected because it weakens the manifest as a recovery/ownership checkpoint.

### 3. Persist immutable operation data before publishing working changes

Use a versioned `.lace/upgrade/` metadata area, outside the manifest inventory. Each unique operation has a transaction directory containing schema-1 `operation.json`, exact old/new manifest bytes, verified before-images and staged target bytes. Assign a random operation ID for separate attempts; deterministic dry-run output does not expose IDs or timestamps. Store path, action, old/new content hashes or absence, original mode and planned mode. The latest-operation pointer identifies the transaction and phase: `applying`, `applied`, `rolling-back`, `rolled-back`.

Create and flush the complete operation directory before atomically publishing its latest pointer. Temporary metadata is never a recoverable operation until published. Keep operation data immutable and validate its inventory, internal identity, ownership restrictions and saved hashes on every load. Retain completed records; a no-op repeated apply does not replace the latest pointer or discard rollback data. A later real upgrade supersedes the pointer only after recording a new independent before-state. Rollback is deliberately only for that latest operation, not a historical stack.

Preflight all destinations for unsupported file/directory shape transitions and case aliases, including metadata paths. Reject physical overlap between installed project and target template to guarantee target immutability. Stage journal data privately because managed deployment files can contain local secrets; never duplicate user source or environment values into output. Saved before-images capture actual pre-apply working bytes, not an unavailable pristine old template.

Alternative: preserve only the old manifest. Rejected because its SHA-256 digests cannot reconstruct removed/replaced files or original permissions.

### 4. Apply and rollback are resumable per-file operations

Acquire the mutation lock, load pending state, validate all inputs, and only then plan a new operation or resume the matching saved operation. Persist target bytes so recovery does not depend on the old external template. A resumed `--apply` still validates the explicitly supplied target against recorded target identity; it cannot silently switch targets with the same version but different hashes/instructions.

For each change in sorted order, recheck current bytes against the recorded expected before-state. Copy staged content to an exclusive temporary file in the destination directory, set appropriate permission bits, flush/close, recheck expected state and rename to the destination. Preserve existing file modes; additions use the staged target mode subject to safe ordinary permission bits. Removal is guarded unlink; directory cleanup is limited to operation-created empty directories. Retain temporary file identity in operation metadata or use a reserved recognizable name tied to the operation so restart can safely discard its own leftovers.

On resume, each path must match recorded old or new bytes (or absence); old states need applying, new states are already applied. Recheck all relevant working and manifest states before committing the new manifest through an atomic same-directory rename. After manifest commit atomically mark `applied`. If the process stops between those two steps, verify new state and finish the status update. Unexpected third-state bytes stop the operation with the exact affected path and recovery commands.

Rollback first validates all saved data and every affected path, then atomically records `rolling-back` before any restoration. Restore before-images/remove additions with the same hash guards and atomic file discipline, restore original manifest bytes last, then mark `rolled-back`. Repeat rollback continues its recorded direction. Apply cannot reverse an interrupted rollback. Files with unexpected post-upgrade edits block the whole rollback before any restoration; rollback never overwrites these edits. A failure during rollback is reported with the saved operation path and repeat-rollback command.

Alternative: automatic best-effort rollback on every exception. Rejected because rollback can itself fail and an explicit persisted direction is easier for operators to inspect and safely repeat.

### 5. Serialize mutations and fail closed on uncertain paths

Use exclusive lock creation beneath the physical project's `.lace/upgrade/`, recording PID, host identity and operation-owner identity. A live owner produces `UPGRADE_BUSY` (exit 6). A dead local owner can be reclaimed only after ownership/liveness checks; an unknown host, malformed owner or uncertain process status produces an actionable refusal. Document manual recovery after verifying no mutation process runs. Release only the lock still owned by this invocation. Tests cover concurrent invocations and hard termination.

Reuse no-follow reads, validate every path component before creation/rename/unlink, create private metadata with restrictive modes and use exclusive temporary files. Reject symlink, traversal, alias and nonregular-file inputs across working tree and metadata. Recheck under the lock before each write. This serializes cooperative CLI processes; it cannot provide a filesystem compare-and-swap against arbitrary editors or privileged attackers. Document that operators must stop editing managed files while applying.

### 6. Version guidance is optional validated data, never executable

Read target `.lace/upgrade-instructions.json` if present. Its exact shape is `{ schemaVersion: 1, templateVersion, database: string[], configuration: string[] }`; no extra fields, matching version, at most 100 entries per array and 8,000 characters per nonempty instruction, rejecting control characters other than tab/newline. Missing data is compatible with existing generated templates. Retain normalized validated guidance with the recorded operation.

Include guidance in the JSON command envelope and readable human output, with an explicit missing-guidance message and reminder to run database migrations/config synchronization as reviewed deployment steps. Instruction strings are plain text: never execute them, interpolate them into a shell, or render terminal control sequences. Upgrade/rollback do not import config or open runtime adapters. Documentation shows existing `db migrate`/`content sync` commands with explicit target selection but leaves the operator responsible for correct deployment order and backups. Filesystem rollback does not undo database migrations.

## Risks / Trade-offs

- [Mixed managed versions during interruption] → Persist operation before writes, keep old manifest until commit, surface pending recovery; apply during a maintenance window and avoid deployment of a pending tree.
- [Disk exhaustion or permission failure] → Stage full metadata first, keep before-images, report partial-operation location and resume/rollback commands; do not claim success after an I/O failure.
- [Power loss differs across filesystems] → Flush files and metadata and directories where supported; test process interruption guarantees and do not claim protection against hardware/filesystem corruption.
- [History consumes disk and may contain deployment secrets] → Restrict metadata permissions, retain data for requested rollback, document operator cleanup only after completing/reviewing an operation.
- [Instruction metadata is publisher-supplied advice] → Strict shape/version validation and plain text handling; no executable behavior or automatic production mutation.
- [Case aliases and shape changes vary across hosts] → Reject unsafe inventories/unsupported shape changes before mutation and test physical paths on the supported CLI host.

## Migration Plan

Ship the CLI with existing schema-1 generated projects unchanged. Test fixture target releases supply optional instruction metadata without requiring generator changes. Review remains the default; explicit apply produces conflict artifacts or a journaled installation. Document maintenance, review, apply, recovery and rollback commands in `packages/cli/README.md` and remove obsolete 24A apply-rejection wording.

Run focused upgrade tests followed by root typecheck, Oxlint, Oxfmt check and strict change validation. On user-authorized completion, synchronize both delta capabilities, verify the main specs, archive the completed change and commit in the current branch. Do not archive incomplete tasks.
