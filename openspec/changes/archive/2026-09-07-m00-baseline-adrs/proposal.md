## Why

Step 0 of the MVP roadmap establishes the reproducible baseline and records the architectural rationale that contributors will need before the workspace is introduced. The repository currently has architecture, roadmap, and OpenSpec configuration but no package workspace, dependency pins, compatibility statement, security policy, or ADRs.

## What Changes

- Implement roadmap **Step 0 — Baseline and ADRs** as one S-sized session unit.
- Verify a selected, mutually compatible set of exact stable toolchain and framework versions in an isolated smoke workspace before committing the baseline pins.
- Add the repository baseline files needed before Step 1: dependency/toolchain pins and the minimal workspace metadata required to install and validate them.
- Add `docs/compatibility.md`, clearly separating supported ranges from the exact versions exercised in CI.
- Add `SECURITY.md` declaring the pre-release status and a private vulnerability-reporting placeholder.
- Add ADRs for package dependency boundaries, Cloudflare D1 guarded batches versus Node interactive transactions, media-reference projection with asynchronous object deletion, and the fixed-command VPS builder security model.

## Capabilities

### New Capabilities

None. This is documentation and project-tooling groundwork; it introduces no runtime product capability.

### Modified Capabilities

None.

The change declares `skip_specs: true` because it does not alter accepted product behavior.

## Impact

- Affects root workspace/tooling metadata, lockfile, documentation, ADRs, and security reporting guidance; it does not add apps, packages, public APIs, database schema, or deployment resources.
- Implements roadmap Step 0 and is governed by architecture sections 4.5, 5, 6, 9, 13, 17, 18, 20, and 22, plus the toolchain guidance in section 18.
- Has no affected accepted capability specs because `openspec/specs/` is currently empty.
- Provides the pinned local `@fission-ai/openspec` CLI that subsequent roadmap work must invoke through pnpm.
