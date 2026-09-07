## Context

See [proposal.md](./proposal.md) for motivation. The repository is deliberately pre-workspace: it contains the architecture, roadmap, OpenSpec configuration, and no accepted capability specifications. Step 0 must establish the dependency baseline that Step 1 will turn into the full pnpm/Turborepo workspace, without creating any product packages or features early.

Architecture sections 5, 6, 9.7, 10, 13, 18, 19, and 22 already settle the relevant technical direction. The ADRs record their rationale in discoverable, decision-specific documents; they do not supersede those architectural invariants.

## Goals / Non-Goals

**Goals:**

- Select exact currently stable releases from their authoritative registries or vendor release channels, then prove they install and run together on the selected Node LTS in an isolated disposable workspace.
- Commit only the reproducibility metadata and documentation necessary for later contributors to reproduce the verified selection.
- Make the four cross-cutting architecture decisions explicit, including their rejected alternatives and operational consequences.
- Define an honest compatibility policy: supported runtime/version ranges are separate from the exact versions exercised by the initial smoke check and future CI.

**Non-Goals:**

- Creating the Step 1 workspace, application/package directories, CI workflow, linter/formatter configuration, or dependency-boundary enforcement.
- Adding any CMS behavior, database schema, API, auth, media, Cloudflare binding, builder service, generated project, or publishing configuration.
- Publishing `@lacecms/*` or `create-lace`; both remain provisional names.
- Promising backward compatibility or production support while the repository remains pre-release.

## Decisions

### Establish the baseline in a root pnpm manifest and catalog

The implementation will create only the minimal root package metadata needed to pin the selected tools and library families, including the package-manager declaration and a pnpm catalog. The committed lockfile is the reproducibility record. The local `@fission-ai/openspec` dependency is included so future work uses `pnpm exec openspec`, while the globally available CLI is used solely to bootstrap this initial change.

The smoke workspace is created outside the repository or in a gitignored temporary directory, installs from the same exact selections, and performs import/build checks appropriate to the selected packages. It is removed after its result is captured in the baseline documentation; no disposable fixture is committed.

This keeps Step 0 independently verifiable while avoiding a partial version of the Step 1 workspace. Deferring all package metadata would leave no place to commit the validated pins; creating apps, turbo tasks, or root quality scripts now would collapse the roadmap boundary.

Alternative considered: commit a complete Step 1 workspace while collecting versions. Rejected because it adds scaffolding and CI behavior that belongs to a separately reviewable session.

### Capture compatibility as policy, not an inference from CI

`docs/compatibility.md` will list (a) exact versions selected and smoke-tested, (b) the supported Node, pnpm, SQLite, Wrangler, and browser ranges, and (c) versions merely used by automation. It will state that only the final category is evidence of CI execution, not a broader support promise. The document will link to the root pins and describe the selection date/source so maintainers can refresh it deliberately.

Alternative considered: use only engines fields and the lockfile. Rejected because neither describes SQLite, Wrangler, browser support, nor the distinction between tested and supported ranges.

### Record architecture decisions as concise ADRs

The implementation will add four sequentially numbered Markdown ADRs under `docs/adr/`, using a consistent status/context/decision/consequences/alternatives format:

1. package boundaries follow architecture section 6 and prohibit cross-package source-path imports;
2. Node uses interactive SQLite transactions while D1 uses explicit guarded atomic batches for known operations, without an invented generic D1 transaction callback;
3. media IDs are projected from validated JSON into relational references and objects are removed through recoverable outbox-driven deletion;
4. the VPS builder exposes an authenticated private fixed-command trigger and rejects caller-supplied command, path, and environment overrides.

These documents cite the architecture rather than redefining product behavior. Alternatives are included where later code could otherwise drift toward an incompatible design.

Alternative considered: leave rationale only in the architecture. Rejected because implementers need focused rationale and rejected alternatives at the point they make package, persistence, media, and builder choices.

### Adopt a minimal pre-release security disclosure policy

`SECURITY.md` will state that Lace is pre-release, directs reporters to a private placeholder contact, asks reporters not to disclose vulnerabilities publicly before acknowledgement, and makes no supported-version or response-time guarantee. The placeholder is intentionally operationally neutral until a project-owned security contact exists.

Alternative considered: claim support for `main` or a public issue tracker. Rejected because neither is an appropriate private vulnerability channel for an unreleased project.

## Risks / Trade-offs

- [A package released during review changes the meaning of “current stable”.] → Resolve the exact versions immediately before the smoke check, record the date and source, and commit only the verified set.
- [Native `better-sqlite3` installation can fail on the selected Node LTS or platform.] → Include it in the disposable install/import smoke check; select a compatible stable release before pins are committed and record any platform prerequisites.
- [The minimal manifest might be mistaken for the Step 1 workspace.] → Keep it limited to pinning and smoke commands; do not add package workspaces, Turbo configuration, CI, app/package directories, or formatter/linter configuration.
- [A placeholder security channel is not actionable for external reporters.] → Label it plainly as a pre-release placeholder and replace it before the first public distribution or release.
- [ADR wording could drift from higher-authority architecture.] → Cite the governing sections and validate every decision against them; update architecture first if a genuine conflict is found.

## Migration Plan

1. Record the pre-change repository state and resolve exact stable versions from authoritative sources.
2. Build and run the isolated smoke workspace on the selected Node LTS; do not pin a failed set.
3. Add the root pins/lockfile, compatibility document, security policy, and four ADRs.
4. Re-run the project-local install and smoke command from a clean dependency state, then run strict OpenSpec validation.
5. Roll back by reverting the committed baseline files; no database, user content, deployed runtime, or published package state is changed.

## Open Questions

- The final private vulnerability-reporting address is an operational release decision. The implementation will use an explicitly marked placeholder and must not invent a contact address.
