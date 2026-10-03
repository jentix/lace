## 1. Command and report contract

- [x] 1.1 Add dedicated doctor parsing, help and lazy dispatch before operational environment loading, with required target/stage and Node-only mode; verify argument rejection performs zero probes, JSON errors identify doctor, and existing CLI argument tests still pass.
- [x] 1.2 Implement ordered check/report types, pure setup/ready classification, safe text/JSON presentation and aggregate exit precedence 4/5/6/0; verify mixed failures, dependent skips, expected initial states, all check ordering and deterministic output independent of completion order.

## 2. Compatibility and configuration prerequisites

- [x] 2.1 Implement bounded regular-file package.json/.env reading, dotenv parsing with process environment precedence and declared engine range validation; verify missing/invalid declarations, incompatible/missing Node/pnpm, malformed/symlink/nonregular/oversized files and absence of interpolation or secret output.
- [x] 2.2 Implement selected native Node, generated Compose and Cloudflare setting validation including host/container variable distinction, Compose mount consistency, URL safety, loopback local Cloudflare selection and explicit Wrangler DB identity; verify current runtime/template fixtures, Pages-only binding rejection and no remote fallback or unrelated settings demand.
- [x] 2.3 Implement fixed bounded pnpm, Compose/daemon and installed Wrangler prerequisite probes with capped output and cleanup; verify Docker is never invoked outside compose, Wrangler is never installed/started, absent/offline tools are actionable, and prerequisite probing creates no project/cache/log files.

## 3. Read-only database and service evidence

- [x] 3.1 Add existing-file read-only Node migration inspection against packaged migration inventory with bounded SQLite execution and no writable runtime opener; verify fresh/absent, missing ledger, outdated/current, corrupt/denied/locked and WAL fixtures, including unchanged file bytes and no new DB/parent/WAL/SHM files.
- [x] 3.2 Add bounded SELECT-only remote D1 ledger inspection with fixed provider endpoint, capped response, redirects disabled and sanitized authorization/missing-ledger/availability classification; verify intercepted requests contain only the ledger read and never fall back to local or disclose provider/credential bytes.
- [x] 3.3 Add anonymous bounded API readiness probing and API-derived local D1 migration evidence, preserving URL path prefixes; verify ready/200, not-ready/503, unexpected statuses, malformed/oversized bodies, redirects, TLS failure, timeout and offline local Worker without creating persistence state.
- [x] 3.4 Add presence-only build-token diagnosis and wire dependent skips plus five-second probe/thirty-second overall cancellation; verify setup empty-token expectation, ready empty-token failure, present-unverified wording, worker/process cleanup and no privileged API/build/storage calls.

## 4. Security and independent consumer verification

- [x] 4.1 Add subprocess human/JSON coverage and injected failure cases with sentinel secrets/paths in settings, arguments, subprocess output, HTTP bodies and exceptions; verify one JSON object, safe diagnostics, fixed report order and exact documented exits without sentinel leaks.
- [x] 4.2 Extend isolated packed-consumer acceptance with initial and ready Node doctor flows and offline/missing-prerequisite cases; use controlled Cloudflare/daemon probe fixtures where external credentials/services are unavailable, and verify installed consumer compatibility is read from its own package.json without source-workspace imports.
- [x] 4.3 Verify concurrent doctors against existing populated SQLite and absent Node/Cloudflare state; compare installation tree, credential/config bytes, content and ledger before/after, and assert no service startup, writes, locks, sidecars or external mutation commands.

## 5. Documentation and completion checks

- [x] 5.1 Document syntax, environment precedence, setup/ready status policy, exit precedence, native/compose settings, explicit Cloudflare requirements and evidence limits in the CLI README and existing generated operations guide; verify examples use packaged commands and do not claim Pages-only CMS onboarding or token/deployment validation.
- [x] 5.2 Update generator template version and affected deterministic snapshots for the managed guide change while preserving ownership rules and published alpha artifacts; verify generator tests and generated snapshots, with no root README or 27B quickstart additions.
- [x] 5.3 Run focused CLI/generator and packed-consumer checks, then root `pnpm typecheck`, `pnpm lint`, `pnpm format:check` and `pnpm exec openspec validate step-27a-read-only-environment-doctor --type change --strict`; record evidence and immediately mark verified tasks complete, leaving synchronization/archive for the explicitly authorized completion action.
