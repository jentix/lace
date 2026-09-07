## Context

See [proposal.md](./proposal.md) for motivation and
[workspace-governance requirements](./specs/workspace-governance/spec.md) for
the behavior contract. Step 0 has already pinned the tooling catalog and lockfile
and documented the least-privilege pnpm build-script allowlist needed by native
or bundled tooling. The repository has no workspace packages, task graph, or CI
workflow yet. Architecture section 6 and ADR 0001 prescribe the package graph;
roadmap Step 1 defines the session boundary.

## Goals / Non-Goals

**Goals:**

- Make every architecture-named app and package a private, independently
  typechecked ESM workspace member with a stable initial public entry point.
- Give all members an executable skeleton so the root quality gates exercise the
  whole workspace now, rather than accepting placeholder success.
- Centralize task orchestration in Turborepo and import-boundary enforcement in
  a TypeScript source-level compatibility checker, including a committed negative
  fixture isolated from the passing source graph.
- Keep CI a thin execution environment for root scripts, with frozen resolution
  and pnpm-store caching keyed by lockfile and supported toolchain version.

**Non-Goals:**

- Adding content, domain, persistence, transport, authentication, admin, site,
  builder, CLI, Node, or Cloudflare product behavior.
- Adding runtime framework dependencies to empty app/package skeletons or
  configuring real development servers, database commands, or integration
  suites before their owning roadmap steps.
- Publishing packages, committing build output, or supplying deployment
  workflows.

## Decisions

### One private ESM package per architecture directory

Create the four app directories (`admin`, `api`, `builder`, and `site`) and the
twelve package directories listed in architecture section 6. Give each a
private `0.0.0` manifest, `type: module`, explicit `exports` and `types`, and
an `src/index.ts` public entry point compiled to ignored `dist/`. Internal Lace
packages use the provisional `@lacecms/*` namespace already recognized by the
architecture; apps use private `@lacecms/app-*` names. Each member has common
build, typecheck, lint, and test scripts that run actual compiler, linter, and
test commands against its small entry-point and smoke-test source.

No member declares a product runtime dependency in this change. Tooling is held
at the root catalog and made available through the workspace. This avoids
locking feature-level package topology before the steps that own those features.

Alternative considered: create only directories and let root commands skip
empty packages. Rejected because it would not prove a buildable member graph or
catch target/configuration drift.

### Four strict TypeScript target bases with package-local extension

Use a shared strict base and distinct library, browser, Node, and Worker configs
to make target intent explicit. Package and app configs extend the appropriate
base and compile only their own source to their own `dist/` directory. The
portable packages (`content` and `config`) use the library target and receive no
Node ambient types; Node apps/adapters use the Node target; the Cloudflare
adapter uses the Worker target; browser-facing apps use the browser target.

Alternative considered: a single root configuration. Rejected because it makes
Node ambient APIs silently available to portable or Worker code and cannot
express browser/Worker constraints clearly.

### Root scripts are the source of all quality-gate execution

`turbo.json` defines dependency-aware `build`, `typecheck`, `lint`, and `test`
tasks. Root `package.json` invokes those tasks and provides `format:check` and
`spec:validate` (the latter executes `pnpm exec openspec validate --all --strict
--no-interactive`). Deferred root commands share a small explicit command helper:
development launchers report their milestone-1 deferral with zero exit status;
unavailable verification and state-changing commands report it with nonzero
status. CI invokes only the root scripts, so local and CI behavior cannot drift.

Alternative considered: add workflow-specific command lines. Rejected because
it would allow CI and local verification to diverge.

### Use a temporary TypeScript source-level boundary checker

The project-pinned TypeScript baseline is 7.0.2, while dependency-cruiser
18.2.0 reports TypeScript support only below version 7 and therefore cannot
analyze the workspace source. Step 1 will not install or invoke
dependency-cruiser. Instead, a small Node script using the pinned TypeScript 7
`typescript/unstable/ast` scanner API will enumerate static `import`,
`export ... from`, and `import type` declarations in workspace source and resolve
them against the explicit package layout. The root TypeScript 7 export only
provides version metadata, so the legacy Compiler API is unavailable at this
baseline. The checker will allow only the directed edges defined in architecture section 6,
ban cycles and cross-package relative/source-path access, and ban Node built-ins
from `content` and `config`. A separate fixture graph deliberately violates one
rule; a dedicated test asserts that the checker fails the fixture while the main
source graph passes.

An architecture edge denotes permission, not an obligation: packages may remain
independent until their owning step adds a dependency. Platform packages share a
rule group but are checked individually to retain separate Node and Cloudflare
targets. The checker exists only as a compatibility bridge. A follow-up must
replace it with dependency-cruiser when a dependency-cruiser release supports
TypeScript 7 without downgrading the project's baseline.

Alternative considered: dependency-cruiser in Step 1. Rejected temporarily
because its current TypeScript parser support excludes the pinned baseline.
TypeScript project references or code review alone were also rejected because
neither checks forbidden imports nor proves the required negative case.

### Minimal CI workflow with reproducibility guardrails

GitHub Actions uses the exact Node and pnpm versions documented by Step 0,
enables Corepack, and restores the pnpm store from a key derived from the
operating system, Node version, pnpm version, and `pnpm-lock.yaml`. It runs
frozen-lockfile installation, verifies that installation did not change the
lockfile, then invokes root format, lint, typecheck, test, build, and strict
OpenSpec validation commands. It does not run integration or deployment jobs
until their runtimes exist.

Alternative considered: cache `node_modules` or use a broad cache key. Rejected
because restored links can be platform-sensitive and stale cache keys weaken
lockfile integrity guarantees.

## Risks / Trade-offs

- [An empty skeleton can look like a supported runtime.] → Package README or
  entry comments and deferred command messages identify the milestone boundary;
  product functionality is introduced only by later changes.
- [The temporary checker could diverge from future dependency-cruiser behavior.]
  → Keep its scope limited to architecture section 6 edges and source-path
  checks, use both permitted and forbidden fixtures, document the deferral, and
  replace it once dependency-cruiser supports TypeScript 7.
- [Tool APIs or pnpm build-script policy differ on a CI runner.] → Carry forward
  Step 0's least-privilege allowlist, use the locked pnpm release via Corepack,
  and fail rather than bypass lifecycle-policy errors.
- [Future generated output causes cache invalidation errors.] → Declare Turbo
  task outputs and inputs deliberately; the initial skeleton has no external
  runtime state or secret input.

## Migration Plan

1. Add the root workspace, tool configuration, and ignored generated-output
   rules while preserving Step 0's catalog and exact lockfile policy.
2. Add all skeleton members and their target-specific TypeScript configurations;
   run the root quality gates before adding boundary rules.
3. Add the temporary TypeScript source-level checker and the isolated negative
   fixture; verify both passing and intentionally failing paths and record the
   dependency-cruiser compatibility deferral.
4. Add CI that invokes the already-passing root commands, then verify the
   workflow syntax and frozen install locally where possible.
5. Roll back by reverting the workspace and CI files. No persisted data,
   deployment state, or published artifact is created by this change.
