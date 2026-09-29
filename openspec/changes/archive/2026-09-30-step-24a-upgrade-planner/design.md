## Context

See proposal.md for motivation. The Step 23 manifest contains schemaVersion 1, templateVersion and per-path ownership/hashes. It intentionally stores no historical bytes or project name. The CLI already has stable exit codes and a sanitized JSON error boundary; its operational parser is separate from the upgrade command.

## Goals / Non-Goals

**Goals:** Produce a plan consumable by 24B using installed baseline hashes and exact working/target bytes, with explicit ownership and deterministic diagnostics for Node and Cloudflare templates.

**Non-Goals:** Apply/recovery, conflict files, migration execution, remote release resolution, semantic merging of user changes into package/Compose files, or modifying generator metadata.

## Decisions

1. Keep planner, manifest validation, filesystem adapter, diff generation and command handling inside `packages/cli`. No new package dependencies or infrastructure imports are needed. Export the planner through the CLI public entry point for 24B. Preserve the existing operational parser and dispatch upgrade before environment loading.
2. Use `--template` to select a pristine generated target directory with a valid manifest. Prepare it with the target generator release using the same project name/options. Hash-verifying this input prevents substitution drift and avoids evaluating executable template code. Registry fetching and implicit latest-version selection are rejected because release distribution is not part of 24A. Target dependency/image versions are represented by normal managed file bytes; no version substitution or special overwrite exception is introduced.
3. Baseline manifest hashes are a sufficient representation of the old template for equality decisions; historical bytes are unnecessary for working-to-target diffs. Existing user ownership is permanent; target managed-to-user transitions conflict. Retain local changes when baseline equals target, including local deletions. If current equals target, report current. Otherwise match baseline to allow replace/remove; mismatches conflict. Additions require an absent local path. Protect reserved user paths even against erroneous manifests.
4. Validate exact manifest/file-record shape, safe version strings and safe path components (also excluding metadata, Windows separators, controls and prototype-related components). Reject file/directory overlap. Inspect every ancestor with lstat, reject symlinks, and open regular managed files without following final symlinks. Do not read user-owned bytes. Validate target hashes before decisions. Stable input errors never echo manifest contents.
5. Produce a single whole-file unified hunk with deterministic headers, exact line counts and no-final-newline markers. This is deliberately simple and reviewable, with linear cost; a shortest-edit/context-hunk algorithm or external `diff` executable would add complexity or portability requirements. Detect nontext bytes and emit a binary notice. Plan hashes describe the inspected snapshot; 24B must revalidate before writing.

## Risks / Trade-offs

- [Large diffs] → Whole-file hunks favor correctness and linear memory; files are infrastructure templates rather than content datasets.
- [Concurrent changes after inspection] → Planning writes nothing; include baseline/current/target hashes, and require 24B to recheck before apply. This plan is not authorization to overwrite later changes.
- [Filesystem adversary changing ancestors during inspection] → Reject observed symlinks and use no-follow file opens. A read-only CLI does not provide an OS sandbox against an actively malicious concurrent process.
- [Template name/options mismatch] → Document matching generation parameters and show exact proposed bytes, including removals, for review.
- [Diffs can contain local deployment values] → Output is an explicit local review artifact; do not send it to remote services or logs automatically.

## Migration Plan

No database or manifest-format migration is required. Existing generator manifests remain compatible. This release adds only read-only command behavior; removing the new command is sufficient rollback. 24B will add transactional writes, updated metadata, conflict artifacts and migration guidance in a separate change.
