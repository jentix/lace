## 1. Target selection and transport

- [x] 1.1 Implement the CLI argument and environment loader with named targets, redacted errors, stable exit codes, and JSON/human output; verify parser and output tests.
- [x] 1.2 Add local Miniflare and remote D1 REST transports for the existing D1 services, including atomic batch semantics and sanitized failures; verify adapter tests and rollback behavior.

## 2. Operator commands

- [x] 2.1 Wire explicit Node and D1 migration commands to checked-in migrations; verify fresh and repeat runs plus remote-selection failure.
- [x] 2.2 Wire `content sync [--check]` to the existing application planner and guarded apply for every target; verify no-write check, compatible apply, and invalid-plan tests.
- [x] 2.3 Wire `auth bootstrap` to existing Node and D1 security services; verify token reveal, expiry, completed-setup refusal, and secret-free errors.

## 3. Schema readiness and integration

- [x] 3.1 Add shared checked-in migration inventory and Node/Worker readiness checks without auto-migration; verify outdated and current schema tests.
- [x] 3.2 Document command usage and deploy order; verify CLI help and repository/generated package script behavior.
- [x] 3.3 Run focused tests, root typecheck, Oxlint, Oxfmt check, and strict OpenSpec validation; fix failures and record completion.
