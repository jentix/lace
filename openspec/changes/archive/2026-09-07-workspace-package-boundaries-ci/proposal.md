## Why

After Step 0, Lace has an architectural baseline and pinned dependency catalog,
but no buildable monorepo or automated enforcement of its package boundaries.
Step 1 establishes that foundation before any product capability introduces
implementation dependencies or cross-package behavior.

## What Changes

- Create the pnpm/Turborepo workspace foundation, strict TypeScript target
  configurations, repository hygiene configuration, and root commands for the
  required developer workflow.
- Scaffold every package and application named in architecture section 6 with
  private initial manifests, explicit public exports and type entry points, and
  runnable build, typecheck, lint, and test scripts; defer product behavior and
  feature-specific dependencies to later roadmap steps.
- Mechanically enforce the accepted package import graph and cross-package
  public-entry-point rule with a TypeScript source-level checker, including a
  negative fixture for a forbidden import. Dependency-cruiser is intentionally
  deferred because its current release cannot parse the project-pinned
  TypeScript 7 baseline.
- Add a GitHub Actions workflow that runs the same frozen-lockfile and quality
  commands as local development, including strict OpenSpec validation and
  lockfile/cache integrity checks.

## Capabilities

### New Capabilities

- `workspace-governance`: Buildable workspace structure, permitted package
  dependencies, developer command behavior, and CI verification requirements.

### Modified Capabilities

- None.

## Impact

- Affects root workspace/tooling files, all `apps/*` and `packages/*` package
  manifests and skeleton sources, dependency-boundary test fixtures, and
  `.github/workflows`.
- Uses the Step 0 pinned catalog and lockfile baseline and the architecture's
  package graph (architecture sections 6, 18, and 19), plus ADR 0001.
- Implements roadmap Step 1 as one S-sized session unit. It intentionally does
  not add CMS features, database schemas, runtime adapters, deployment
  resources, or user-facing API behavior.
- The deferral is temporary: a follow-up must replace the compatibility checker
  with dependency-cruiser once a supported release can analyze TypeScript 7.
