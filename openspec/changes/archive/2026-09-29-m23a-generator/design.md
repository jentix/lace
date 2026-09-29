## Context

The source workspace has a placeholder `@lacecms/cli`, a monorepo-bound Astro fixture, and Docker Compose paths that refer to engine source. Architecture §7 instead calls for a consumer project with user-owned `site/**` and `lace.config.ts`, managed infrastructure, and a manifest usable by Step 24 upgrades. See `proposal.md` and `specs/project-generator/spec.md`.

## Goals / Non-Goals

**Goals:** An executable generator that is safe on a fresh path or an otherwise empty existing repository; a deterministic template inventory with explicit ownership; complete staged publication and recovery.

**Non-Goals:** Running migration/sync/bootstrap commands (23B), packed-dependency and deployment acceptance (23C), upgrade planning (24A), or publishing packages and images.

## Decisions

1. **Separate `create-lace` package.** `packages/create-lace` owns command parsing, filesystem generation, and bundled template files. It uses only Node standard APIs. A bare directory argument maps to `create <dir>` because `pnpm create lace my-site` invokes the package binary with that bare argument. `@lacecms/cli` remains the future operational CLI, preserving the package boundary. The package's published file list includes compiled JS and templates; no engine/admin source is copied. Alternative: extend the operational CLI; rejected because `pnpm create lace` needs a small independent executable.
2. **Static template inventory with explicit classification.** A checked-in inventory lists template paths and owner. The generator reads exact template bytes, substitutes a validated project name only in declared text files, writes them into a sibling staging directory, and derives managed hashes from those final bytes. `manifest.json` has a schema number, template version, and sorted file map; it excludes itself to avoid recursive hashing. Alternative: infer ownership from path patterns; rejected because new infrastructure files could be misclassified silently.
3. **Target validation and two publication paths.** `create` refuses existing non-allowed content and publishes a sibling staging directory by rename. `init` only accepts the current directory, rejects symlinks, copies the three permitted entries into staging, then renames original to a unique sibling backup and staging to target. On the second rename failing, restore the backup; leave an identified backup if restoration fails. Any error cleans staging when possible, reporting remaining paths. This avoids partial writes in the target. An existing directory cannot be atomically replaced in one rename on common filesystems, so `init` has a short rename gap and backup-based recovery. Alternative: write generated files in place; rejected because it leaves partial output.
4. **Generated dependency seam.** The root project pins `@lacecms/config` and `@lacecms/content`, while `site/package.json` pins Astro and `@lacecms/sdk`; Docker Compose uses explicit image variables. The current monorepo packages are private `0.0.0`, so 23C must validate with local packed artifacts and later released image coordinates. The starter does not embed editable engine/admin source or secrets. Cloudflare files are opt-in and contain only deployment placeholders.
5. **Observability and failures.** Human output includes the created path and next steps; errors identify the invalid entry or filesystem operation without printing environment values. Generation has no database or network side effects. Unit tests use temporary directories and a controlled failure hook at publication boundaries.

## Risks / Trade-offs

- [A process crash during `init`'s rename gap can leave a backup] → use a distinctive sibling backup path and print recovery instructions on caught errors; a future recovery command is outside 23A.
- [Published package/image coordinates are not yet finalized] → keep generated references explicit, avoid claiming install or deployment acceptance before 23C, and keep names consistent with architecture §25.
- [Project-name interpolation can affect byte stability] → deterministically normalize the directory basename to a safe package name and make generated content independent of absolute path and current time.

## Migration Plan

No migration. Rollback removes the new generator package and generated-project capability spec; existing source workspace behavior stays intact.
