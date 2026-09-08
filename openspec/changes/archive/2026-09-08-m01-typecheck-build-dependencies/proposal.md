## Why

The Typecheck CI gate cannot resolve a workspace dependency from a clean
checkout because its declaration files have not been built. This violates the
accepted clean-workspace verification contract and is masked on developer
machines by existing `dist` output.

## What Changes

- Update Turborepo's `typecheck` task graph so a package typecheck waits for
  builds of its workspace dependencies and their public declarations.
- Verify typecheck from generated-free workspace output so the configuration
  package resolves `@lacecms/content` through its declared public entry point.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- None. This is a tooling repair that makes the existing `workspace-governance`
  clean-workspace verification requirement pass without changing its behavior.

## Impact

- Implements a focused Step 1 CI/workspace repair under architecture section 6
  and the accepted `workspace-governance` specification.
- Affects only `turbo.json` task ordering and test/verification coverage; it
  does not modify package APIs, dependencies, application behavior, or CI
  commands.
