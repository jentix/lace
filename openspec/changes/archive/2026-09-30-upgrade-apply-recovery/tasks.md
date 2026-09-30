## 1. Validated operation inputs and recovery metadata

- [x] 1.1 Add strict target instruction metadata validation and command-envelope guidance without changing the deterministic planner contract; verify missing metadata compatibility, version mismatch, bounds, unknown fields and control-character rejection in focused input tests (migration-guidance requirement; design decision 6).
- [x] 1.2 Add safe filesystem destination/metadata helpers, reject project/template overlap and unsupported file/directory transitions, and validate operation schema, inventories, saved hashes and modes; verify traversal, symlink, case-alias, corrupted/newer metadata and reserved/user-owned mutation rejection before working writes (safe-mutation requirement; design decisions 3 and 5).
- [x] 1.3 Implement exclusive project mutation locking with owned release, live-owner refusal and conservative dead-local-owner recovery; verify competing operations, ambiguous ownership and process-death recovery without corrupting another owner's lock (safe-mutation requirement; design decision 5).

## 2. Guarded apply and conflict artifacts

- [x] 2.1 Implement conflict-bundle staging/publication with proposed bytes, diffs and removal/ownership records under `.lace/conflicts/<version>/`; verify mixed safe/conflicted plans leave every working file and manifest unchanged, repeat publication is safe and edited artifacts are preserved (conflict-artifact requirement; design decision 2).
- [x] 2.2 Persist immutable operation data and latest-operation state before the first working change, including exact old/new manifests, before-images, target bytes, hashes and permissions; verify injected staging failures leave working files unchanged and saved records suffice without an old template directory (explicit-apply and recovery requirements; design decision 3).
- [x] 2.3 Implement guarded add/replace/remove through destination-local temporary files, manifest-last publication and user-ownership-preserving inventory construction; verify dependency/image changes, additions/removals, file modes, `site/**`/config preservation, unchanged-template local edits, target immutability and changed-input refusal (explicit-apply requirement; design decisions 2 and 4).

## 3. Resume and rollback

- [x] 3.1 Implement pending-operation detection and matching-target resume using saved old/new states, including the crash window after manifest publication; verify interrupted replacement/removal/addition, different target identity, corrupted saved bytes, unexpected edits and preservation of the original rollback baseline on repeated no-op apply (recovery requirement; design decision 4).
- [x] 3.2 Implement latest-operation rollback, all-path preflight, persisted rollback direction and original-manifest-last restoration; verify completed/partial upgrade rollback, removed-file restoration, added-file removal, exact modes/manifest restoration, missing-history errors, later-edit refusal before any restoration and repeat interrupted/completed rollback (rollback requirement; design decision 4).

## 4. CLI behavior and operator documentation

- [x] 4.1 Wire explicit `--apply` and template-free `--rollback`, reject invalid combinations, add public operation exports and stable result/error envelopes, and surface pending recovery in lock-free dry runs; verify argument parsing, human/JSON outcomes, exit codes 0/2/3/4/6, unchanged existing operational commands and byte-identical repeated dry runs (modified planner CLI requirement; design decision 1).
- [x] 4.2 Include validated target guidance and explicit deployment reminders in review/apply/recovery output without executing text or runtime operations; verify a fixture with database/config instructions, absent guidance and runtime-credential-free Node/Cloudflare invocation (migration-guidance requirement; design decision 6).
- [x] 4.3 Update `packages/cli/README.md` with review/apply/conflict resolution, maintenance, pending recovery, rollback, conservative stale-lock recovery, private metadata cleanup and version instruction format; verify examples match CLI help and clearly distinguish filesystem rollback from database migration reversal (all operation requirements; design migration plan).

## 5. Acceptance and quality gates

- [x] 5.1 Extend generated-project integration tests for both default Node and optional Cloudflare templates: unchanged upgrade, user-owned edits, modified Compose/Worker conflicts, repeated apply and rollback; verify full before/after file snapshots and no runtime/database/network execution (roadmap 24B acceptance).
- [x] 5.2 Add deterministic operation-boundary fault injection and child-process hard-termination coverage for pre-journal, post-file, pre/post-manifest and interrupted rollback boundaries; verify fresh-process detection, safe resume/rollback, temporary-file handling and concurrent invocation refusal (recovery and safe-mutation requirements).
- [x] 5.3 Build affected CLI/generated fixture dependencies and run the narrowest relevant upgrade tests, then `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm exec openspec validate upgrade-apply-recovery --type change --strict`; verify all pass before marking implementation complete (repository quality gates).
