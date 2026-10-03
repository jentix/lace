# Step 27A verification

Verified on 2026-10-02 with Node 24.12.0 and pnpm 12.3.4 in branch
`codex/step-27-environment-checks-quickstart`.

## Implemented behavior

`lace doctor` requires an explicit target and setup/ready stage. Native and
generated Compose prerequisites remain separate; Cloudflare never falls back to
another target. Reports contain ordered pass/expected/fail/skipped checks,
sanitized recovery guidance and deterministic JSON. The doctor reads project
engine declarations, regular environment files and migration/readiness evidence
without evaluating project configuration or running mutation commands.

## Checks and evidence

- `pnpm --filter @lacecms/cli test`: 22 test files, 166 tests passed, including
  existing Node/D1 operational and upgrade regressions.
- `pnpm --filter create-lace test`: 2 test files, 12 tests passed, including
  generated Astro rendering and ownership/determinism checks.
- Focused doctor tests: 19 tests passed across argument/report, prerequisite,
  transport, cancellation, redaction and real SQLite coverage.
- `node scripts/generated-project-acceptance.mjs packages`: generated consumer
  installed 12 independently packed Lace packages, completed ordinary and frozen
  offline installs, prepared credentials, migrated explicitly, and verified
  doctor setup/ready, missing settings, unavailable API, offline WAL safety,
  consumer-owned engine ranges, secret exclusion and unchanged installation
  files. Docker and API readiness used controlled local fixtures; no deployed
  service or provider acceptance is claimed.
- Generated default/Cloudflare snapshots matched two independent regenerations;
  the source ownership template is now 0.5.0 for the changed managed operations
  guide. Existing published 0.1.0-alpha.1 artifacts remain unchanged.
- Root `pnpm typecheck`, `pnpm lint`, `pnpm format:check` and `git diff --check`
  passed. CLI Oxlint reports zero warnings/errors; existing unrelated db-test
  warnings remain non-failing.
- `pnpm exec openspec validate step-27a-read-only-environment-doctor --type change --strict`
  passed before synchronization/archive.

Sandbox blocked local HTTP/workerd sockets and the first consumer installation.
The affected suites and consumer acceptance were rerun successfully with access
to local sockets/network; failing sandbox runs are not counted as acceptance.

## Read-only limits

SQLite read-only WAL access can change existing SHM reader marks. Doctor detects
WAL and returns DATABASE_UNAVAILABLE without opening it; tests compare database,
WAL and SHM bytes before/after concurrent probes. The separate API readiness check
remains available. Independent offline ledger checking requires an explicit
operator checkpoint and rollback-journal preparation outside doctor; the packed
ready fixture performed that preparation before taking its comparison snapshot.

Rollback-journal SQLite inspection uses a bounded read-only subprocess. Missing,
outdated, corrupt, denied, locked and concurrent populated cases are covered
without new database/parent/sidecar/lock files. Local D1 uses only the already
running Worker's readiness; offline migration state is explicitly skipped and
its persistence directory is untouched. Remote D1 coverage intercepts only the
fixed ledger SELECT; no real account/resources were accessed.

Token checks establish presence only. Readiness does not verify synchronization,
object storage, publication or static deployment. Root README and the concise
setup example remain session 27B work.
