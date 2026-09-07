## 1. Root workspace and toolchain

- [x] 1.1 Expand the root pnpm workspace definition to include `apps/*` and `packages/*`, preserve the Step 0 catalog and least-privilege build-script allowlist, regenerate `pnpm-lock.yaml`, and verify `pnpm install --frozen-lockfile` succeeds from a clean install state without a dependency-cruiser dependency.
- [x] 1.2 Add root `package.json` commands, `turbo.json`, `.editorconfig`, `.gitignore`, `.oxlintrc.json`, `.oxfmtrc.json`, strict shared TypeScript base configurations for library/browser/Node/Worker targets, and explicit deferred-command helper behavior; verify `pnpm dev:node` exits zero with its milestone-1 message while `pnpm test:integration` exits nonzero with the same clear deferral.
- [x] 1.3 Wire root `build`, `typecheck`, `lint`, `test`, `format:check`, and `spec:validate` commands to real workspace tooling; verify each command invokes its intended task and that `spec:validate` runs `pnpm exec openspec validate --all --strict --no-interactive`.

## 2. Workspace member skeletons

- [x] 2.1 Scaffold private ESM manifests, explicit `exports` and `types`, package-local target config, public `src/index.ts`, and executable build/typecheck/lint/test scripts for `packages/domain`, `application`, `server`, `contracts`, `content`, `db`, `auth`, `config`, `sdk`, `platform-cloudflare`, `platform-node`, `cli`, and `test-utils`; verify every package is discovered by `pnpm -r list` and compiles its public entry point to its own ignored `dist/` output.
- [x] 2.2 Scaffold the same private ESM contract and executable skeleton scripts for `apps/admin`, `api`, `builder`, and `site`, assigning browser, Node, or Worker target configs as designed; verify root typecheck covers all four apps without granting Node ambient APIs to portable or Worker code.
- [x] 2.3 Add minimal member smoke tests and Turbo task inputs/outputs so build, typecheck, lint, and test execute across every workspace member; verify the four root quality commands pass on a clean checkout and no generated output is tracked.

## 3. Temporary dependency-boundary enforcement

- [x] 3.1 Implement a TypeScript source-level compatibility checker, using the TypeScript 7 `typescript/unstable/ast` scanner API, for the complete architecture section 6 directed graph, public-entry-point-only cross-package access, portable-package Node-builtin prohibition, and circular-dependency rejection; verify the production source graph passes the boundary command without dependency-cruiser.
- [x] 3.2 Add a focused allowed-import fixture and an isolated forbidden-import fixture with an automated assertion; verify the allowed graph passes, the forbidden fixture fails with a boundary diagnostic, and the fixture cannot make the root production graph fail.

## 4. CI and documentation

- [x] 4.1 Add GitHub Actions CI using the Step 0 Node and pnpm baseline, Corepack, a lockfile/version-keyed pnpm-store cache, frozen installation, explicit unchanged-lockfile check, and only root format/lint/typecheck/test/build/spec-validation commands; verify the workflow configuration contains no divergent quality command or unavailable integration/deployment job.
- [x] 4.2 Update `docs/compatibility.md` to identify the exact Node and pnpm versions now used by CI, document the workspace quality commands, and record the temporary dependency-cruiser deferral caused by its lack of TypeScript 7 parser support; verify it no longer states that no CI workflow exists.

## 5. End-to-end verification

- [x] 5.1 Run `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm spec:validate`, and the dependency-boundary positive/negative checks; verify all required passing checks succeed and the negative fixture fails only as asserted.
- [x] 5.2 Review the final file set against roadmap Step 1 and architecture sections 6, 18, and 19; verify every architecture-named workspace member exists, no source-path cross-package import or product implementation dependency was introduced, CI and local commands share the same root scripts, and no Step 2-or-later behavior entered the change.
