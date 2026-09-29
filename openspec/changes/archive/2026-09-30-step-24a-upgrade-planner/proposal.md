## Why

Step 24 — Upgrade safety, session 24A — Upgrade planner builds on the verified Step 23 generator. Projects have ownership hashes but no way to review an engine/template upgrade before modifying deployment files.

## What Changes

- Add a read-only three-way planner using the installed manifest's baseline hashes, current project bytes, and a validated target template directory.
- Add `lace upgrade --template <dir> [--project <dir>] [--json]`: dry-run by default, sorted decisions and unified diffs, stable failure and conflict exit codes.
- Preserve all user-owned paths; plan dependency/image changes in unchanged managed files and report modified managed files as conflicts.
- Validate version-1 manifests and fail closed on unsafe paths, symlinks, invalid target hashes, or unknown formats.
- Explicit apply is reserved for 24B and fails without writing in 24A. Apply transactions, conflict artifacts, recovery, registry download, codemods and database migrations are non-goals.

## Capabilities

### New Capabilities

- `upgrade-planner`: Validated, deterministic, read-only project upgrade decisions and CLI output.

### Modified Capabilities

None. The accepted `project-generator` and `operational-cli` behaviors remain intact.

## Impact

Architecture sections 4.8, 6, and 7 govern workflow, package boundaries and ownership. `packages/cli` owns filesystem inspection and planning; no runtime adapter, network dependency, or schema migration is needed. Both Node/VPS and optional Cloudflare projects use the same planner. The target directory is an explicitly selected pristine generated template with its own manifest, prepared outside this command; the old manifest already supplies baseline managed-file hashes, so historical template bytes are not required for decisions. Step 24B consumes this plan later.
