## 1. Generator package and templates

- [x] 1.1 Add a publishable `create-lace` workspace package with `create-lace` bin, build/typecheck/lint/test scripts, and verify package build and bin resolution.
- [x] 1.2 Add an explicit owned/managed template inventory and the default Astro/config/workspace/Compose/environment files; verify the generated tree has no engine/admin source or secrets.
- [x] 1.3 Add optional Cloudflare config/workflow templates and verify `--cloudflare` alone includes them.

## 2. Safe generation

- [x] 2.1 Parse `create <dir>`, bare `<dir>` shorthand, and `init .`, validate targets and allowed entries without following symlinks, and verify rejection cases in focused tests.
- [x] 2.2 Stage generation in a sibling directory, compute sorted ownership metadata and exact-byte managed hashes, and verify deterministic output and hash tests.
- [x] 2.3 Publish by rename with backup/restore for existing targets, report remaining recovery paths on failure, and verify failure injection leaves the original intact.

## 3. Documentation and gates

- [x] 3.1 Document generator usage, ownership, generated runtime seams, and recovery in package README; verify the documented commands against a generated sample.
- [x] 3.2 Run focused generator tests, root typecheck, lint, Oxfmt check, and strict OpenSpec change validation; fix any failures.
