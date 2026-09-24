## 1. Local synchronization

- [x] 1.1 Add the fixed root-config Node sync entry point and local Compose wrapper; verify plan output, no-op, `--check`, invalid arguments, and stale-plan diagnostics with focused tests.
- [x] 1.2 Test migrated SQLite first sync, repeated no-op, safe config change, blocked unsafe change, and non-mutating check; verify singleton drafts, empty collections, public state, and outbox invariants.

## 2. Admin guidance and documentation

- [x] 2.1 Add content landing no-model, pending-page-sync, and API-error states plus cautious empty-collection guidance; verify role-aware browser navigation from synchronized page and collection models with focused Admin tests.
- [x] 2.2 Update README and Node guide with `content:sync`, `--check`, restart order, first-sync results, and failure recovery; verify commands and paths against the implementation.

## 3. Completion checks

- [x] 3.1 Run narrow tests, root typecheck, Oxlint, Oxfmt check, and strict OpenSpec change validation; verify all checks pass and task results match the delta specs.
