## Context

See [proposal.md](proposal.md). `apps/api/src/dev.ts` currently calls `createNodeDevelopmentConfig()` from `packages/platform-node/src/runtime.ts`, which builds minimal hard-coded home and posts models. The root development Compose service mounts the workspace at `/workspace` and builds the API before running it. `@lacecms/config` already provides the typed definitions and asynchronous normalizer. Astro owns its route files; the API does not generate them. Session 13B owns database synchronization.

## Goals / Non-Goals

**Goals:**

- Make the root file the one development configuration source and keep its type inference visible to editors.
- Reject missing or invalid configuration before the Node listener starts.
- Preserve a runnable clean checkout and clear route and restart instructions.

**Non-Goals:**

- Runtime file watching, an HTTP configuration loader, database sync, and Astro route generation.

## Decisions

1. **Keep the project file at the repository root and import it from the Node development composition.** The entry point depends directly on the project-owned module; portable `@lacecms/config` remains free of Node file loading. The module exports the normalized result of `defineConfig`, so composition consumes one startup snapshot. A generic path supplied by environment or HTTP would add arbitrary code selection and is unnecessary for the single-site development layout.
2. **Use the existing block registry and typed definitions in the example.** The home and posts examples keep their canonical `/` and `/blog/:slug` routes and demonstrate fields and allowed blocks. Structural changes from the old bare development models use a higher model version. The examples are definitions only; no startup mutation attempts to reconcile stored models.
3. **Load the root TypeScript module through Node's built-in type stripping.** Node 24.12 is pinned for local development and can import a TypeScript file that uses erasable type syntax. A fixed URL relative to the emitted `apps/api/dist` entry point resolves `/workspace/lace.config.ts` in Compose and the same root file on the host. This avoids moving user-owned code under the API package's `rootDir` and avoids a second compiler or runtime dependency. Add a root-project TypeScript check so the example is checked despite living outside package `tsconfig` includes. A targeted loader test should verify the fixed path and sanitized failure; a startup test should prove invalid configuration prevents binding. HTTP cannot provide an alternative path.
4. **Document presentation ownership.** The README points to a concise Node guide with a model example, route-file mapping, version and `renamedFrom` rules, restart command, and explicit Session 13B sync boundary. Existing Astro route files remain the usable reference presentation.

## Risks / Trade-offs

- **Changed example structure differs from an existing local database** → State that 13A loads configuration only; Session 13B's explicit planner handles safe transition and must reject unsafe changes.
- **A module import fails after compilation or inside Compose** → Verify emitted paths and run the narrow API startup test; the Compose mount and build must see the same root file.
- **Startup diagnostics expose a raw exception** → Report the configuration file and a sanitized validation summary, without values from environment secrets or arbitrary source snippets.

## Migration Plan

Add the root file, switch the development entry point, and remove the hard-coded helper after its remaining tests migrate to an explicit fixture. A clean checkout starts through the existing `pnpm dev:node` path. Rollback restores the prior development composition without a database migration. Existing SQLite contents remain untouched by this session.
