## Why

Roadmap Step 23, Session 23A needs a reproducible way to create a Lace project without copying the engine source. The existing `@lacecms/cli` is a placeholder, and the repository's Astro site and Docker Compose files are tied to the monorepo. Architecture §§2, 3, and 7 require a generated, upgrade-aware project with user-owned site/configuration and hashed managed infrastructure.

## What Changes

- Add the `create-lace` executable with `create <dir>`, the `pnpm create lace <dir>` shorthand, and `init .`, strict target validation, and optional Cloudflare files.
- Generate a standalone pnpm project with typed `lace.config.ts`, user-owned Astro `site/**`, root workspace and runtime/deployment files, `.env.example`, and `.lace/manifest.json`.
- Record the template version and SHA-256 of every managed generated file; classify all generated paths and keep secrets out of templates and metadata.
- Stage output in a sibling directory, preserve an allowed existing target on failure, and give recovery instructions if cleanup cannot finish.
- Add generator usage documentation and focused tests for output, ownership, collisions, deterministic hashes, and rollback.

## Capabilities

### New Capabilities

- `project-generator`: command behavior, generated layout, ownership manifest, deterministic output, and transactional failure handling.

### Modified Capabilities

None. Existing `workspace-governance` describes the Lace source monorepo and does not govern generated consumer projects.

## Impact

- Code: new `packages/create-lace` workspace package and its bundled templates; root workspace package discovery and lockfile.
- Interfaces: `create-lace create <dir> [--cloudflare]`, `pnpm create lace <dir> [--cloudflare]`, and `create-lace init . [--cloudflare]`.
- Dependencies: Node standard library only for the generator. Generated package names remain the provisional `@lacecms/*` names from architecture §25.
- No database changes. No operational commands, remote environment selection, upgrade planner, package tarball acceptance, or deployed Cloudflare workflow verification (Sessions 23B, 23C, and Step 24).
