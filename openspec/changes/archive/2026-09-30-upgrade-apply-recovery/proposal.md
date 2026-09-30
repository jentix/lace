## Why

Roadmap Step 24, Session 24B — Apply and recovery — completes the reviewed upgrade planner delivered in 24A. Operators currently cannot apply a plan, inspect conflict artifacts, or recover an interrupted upgrade without manually manipulating managed files and their ownership baseline.

## What Changes

- Enable explicit `lace upgrade --template <dir> --apply` while retaining the read-only default, deterministic plans, and existing ownership protection.
- Stage verified replacements and before-images, use atomic per-file renames, and commit the new ownership manifest last. Persist enough operation metadata before mutation to resume an interrupted apply or explicitly roll it back.
- For a conflicted plan, publish proposed files, diffs and resolution metadata under `.lace/conflicts/<version>/`; leave working managed files and the installed manifest unchanged until all conflicts are resolved by the operator.
- Add `lace upgrade --rollback [--project <dir>] [--json]` to restore the latest upgrade's saved pre-apply managed bytes and manifest, with guards against subsequent edits.
- Report target-version database/configuration migration instructions without executing migrations, evaluating project config, or contacting a runtime.
- Verify generated Node and Cloudflare projects, including process interruption, repeat apply, rollback, concurrent invocations, and preservation of user source.

Scope is only Session 24B. Dependencies are the accepted 24A planner and Session 23 generator/operational commands. Non-goals are package installation, release downloading, automatic conflict resolution, database rollback, automatic production migrations, arbitrary project integration, and Step 25 release certification.

## Capabilities

### New Capabilities

- `upgrade-apply-recovery`: Guarded filesystem apply, conflict artifacts, durable recovery metadata, explicit filesystem rollback, and version-associated migration guidance.

### Modified Capabilities

- `upgrade-planner`: Replace the temporary rejection of `--apply` with explicit apply/rollback dispatch while retaining the read-only default and stable dry-run output.

## Impact

Architecture references: sections 4.8 (spec-driven delivery), 6 (package boundaries), and 7 (generated project ownership, managed hashes, explicit migration steps). Accepted specs: `upgrade-planner`, `project-generator`, and `operational-cli`; the latter two remain unchanged.

Implementation stays in `packages/cli`: extend `upgrade-command.ts`, `upgrade-input.ts`, `bin.ts` and public exports as needed; add filesystem operation/recovery helpers alongside `upgrade.ts`. Update focused CLI tests and `packages/cli/README.md`. The manifest remains schema version 1; recovery/instruction metadata use separate versioned files under `.lace`. No runtime APIs, database schema, generator-owned source templates, or new dependencies are required. Node CLI operations apply the same ownership policy to both generated deployment targets.
