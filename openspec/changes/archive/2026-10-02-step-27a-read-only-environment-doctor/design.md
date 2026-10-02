## Context

See proposal.md for motivation and scope. CLI arguments, presentation and environment loading live in `packages/cli/src/index.ts`; `bin.ts` lazily dispatches special commands before operational loading. The current `loadEnvironment` fails on the first missing setting and `commands.ts` opens writable Node/D1 adapters, so neither is a suitable doctor orchestration path. `openLocalD1` starts Miniflare, whose installed implementation creates persistence directories. Importing root `lace.config.ts` executes user code; doctor will not import it.

Node and Worker `/health/ready` already compare their packaged migration ledger with every checked-in migration and return exactly `{status: "ready"}`/200 or `{status: "not_ready"}`/503. Generated Compose maps host-side root MinIO credentials into different API variable names and mounts `./.lace/data` at `/data`; requiring container paths/settings on the host would give false failures. The generated Wrangler template is Pages-only, so CMS diagnosis must not presume a DB binding exists.

## Goals / Non-Goals

**Goals:** Build one CLI-owned diagnostic pipeline with injected filesystem/process/network readers, pure classification and deterministic presentation. Preserve package dependency direction and current commands. Report independent failures together while skipping dependent probes.

**Non-Goals:** A synchronization audit, storage write test, privileged token check, first-admin status disclosure, generic process runner, offline reverse-engineering of Miniflare persistence, or a guarantee that publication/deployment succeeds.

## Decisions

### Separate doctor parsing and dispatch

Add a dedicated parser/result model and doctor branch in `bin.ts` before `loadEnvironment`, following the existing preparation/upgrade dispatch pattern. Extend operation identification to recognize `doctor`; malformed doctor arguments produce existing sanitized usage diagnostics. Keep the normal operational parser behavior unchanged. Require target and stage to prevent an implicit production/local or lifecycle assumption; Node mode defaults to native and is disallowed for Cloudflare. No auto-discovery from Compose files or manifest flags.

### Read-only environment loading and validation

Doctor reads a bounded regular root `.env` if present with `node:util.parseEnv`, then overlays supplied process environment; this lets `pnpm exec lace doctor ...` work before `.env` exists and avoids Node's early `--env-file` error. Reject symlinks/nonregular environment files and oversized files with safe configuration guidance. Never execute/interpolate dotenv bytes. Read root package.json as bounded JSON; validate `engines.node` and `engines.pnpm` against process.version and bounded `pnpm --version`. Use a maintained semver parser if necessary, declared directly rather than relying on an undeclared transitive dependency; malformed ranges fail safely. Do not infer compatibility solely from engine-workspace constants.

Native Node validates the same named runtime settings as `parseNodeRuntimeSettings` without constructing the runtime. Compose validates generated host inputs: database path, public/API URLs, auth secret, root MinIO keys, bucket/region/timeout, builder secret, API/builder image declarations and API/HTTP ports. Apply generated defaults for optional settings exactly as the template does. Compose host database selection must resolve to the generated `./.lace/data/lace.sqlite` bind mount; a different path is a settings failure rather than inspecting an unrelated database. Compose does not parse/evaluate arbitrary YAML or run `docker compose config` (which can reveal credentials).

Cloudflare validates named local or remote D1 settings and reads the explicitly selected Wrangler JSONC file, checking DB identity with existing `verifyD1Config` semantics. Require `LACE_WRANGLER_CONFIG` explicitly for doctor instead of silently selecting source-workspace configuration. Validate the project-local Wrangler executable, never download it through `pnpm dlx`. Local mode requires `LACE_CLOUDFLARE_PERSIST_TO` and a loopback readiness origin and does not require remote credentials. Remote mode uses the fixed Cloudflare D1 HTTPS provider endpoint. Shared API transport setting is `LACE_API_BASE_URL`; require a valid absolute HTTP(S) URL with no userinfo/query/fragment and preserve intentional path prefixes when appending `health/ready`.

### Fixed probes and deadlines

Use ordered check IDs: `project`, `node`, `pnpm`, `settings`, `docker-compose`, `docker-daemon`, `wrangler`, `cloudflare-binding`, `migrations`, `api-readiness`, `build-token`. Inapplicable checks remain explicitly skipped. Execute independent probes concurrently only where useful and assemble output in this order. Failed dependencies suppress their associated external accesses, but do not suppress unrelated checks.

Spawn only fixed executable/argument arrays with shell disabled: pnpm version, Docker Compose version, Docker daemon info with a fixed narrow format, and installed Wrangler version. Disable Wrangler telemetry/update checks, supply CI mode and isolated non-writing probe configuration as supported; verify the process creates no cache/log files. If Wrangler's version command cannot meet that invariant, read/validate the installed package version and executable metadata instead of launching it. Do not forward subprocess output except a strictly parsed version. Capture at most 64 KiB per file/process/HTTP body. Each probe has a five-second limit; the orchestrator has a thirty-second budget and aborts remaining external work on expiry. Kill timed-out subprocesses, clear timers and close readers; no unbounded `spawnSync` or request-body reads.

### Migration evidence without writable adapters

Node uses `node:sqlite` read-only access to an existing regular non-symlink file and SELECT-only migration queries, comparing packaged `checkedInMigrations`. Reject `:memory:` as an uninspectable persistent installation. Never call `openNodeDatabase` or issue journal-mode/foreign-key initialization PRAGMAs. Verify the read-only open cannot create missing WAL/SHM state; preflight WAL state and fail safely when the platform cannot read it without creating sidecars. Do not use immutable SQLite mode on an active WAL database, which could misreport stale state. Bound SQLite work in a terminable worker/subprocess if synchronous opening/querying cannot honor the outer deadline. Missing file/ledger and outdated ledger are stage-sensitive; corrupt/locked/denied reads are failures in both stages.

Remote D1 performs a fixed SELECT of `d1_migrations`, using the same response/missing-ledger classification as `d1-transport.ts` with explicit abort and body limits. Reuse only genuinely read-only parsing helpers; do not change mutation command timeout behavior as incidental scope. Credentials go only to the fixed provider URL, with redirects rejected.

Local D1 migration evidence comes from the accepted existing Worker readiness contract. Ready/200 means API-derived migration readiness; not-ready/503 means the API is reachable but not ready, not a guessed missing-ledger diagnosis. Unreachable local API gives an expected setup or failed ready API check and a skipped migration check explaining that offline ledger state was not inspected. This deliberately avoids running Miniflare, guessing database filenames or adding another operator path that could point to the wrong D1 database. Document that the explicit API URL must identify the same selected Worker; readiness is evidence from that endpoint, not independent identity attestation.

### Stage policy and report aggregation

Keep probes as observations and classification as a pure policy. Setup tolerates only documented unfinished steps; ready requires migration/API readiness and a present build token. Presence checks never send a build token or claim authorization. A service timeout/refused connection may mean API unavailable; malformed data, redirects, unexpected statuses and TLS/authorization failures remain failures in either stage.

Report schema and codes are specified in the delta. Choose exit 4 before 5 before 6 for mixed failures; pass/expected/inapplicable-only reports use 0. Skipped checks caused by a failure cannot mask that failure. Safe fixed message catalogs include setting names and target-specific advice only, with no environment-derived strings, paths, provider messages or exception text. Human output enumerates every check; JSON contains a single top-level report. No timestamps/durations or probe completion order enter output.

## Risks / Trade-offs

- Read-only SQLite can still create shared-memory files in some WAL configurations → verify absent/present WAL sidecars in real fixtures and fail safely where non-writing access is unavailable.
- Readiness cannot independently inspect offline local D1 or prove target identity → label API-derived evidence and explicit URL responsibility; avoid state creation or guessed files.
- An unavailable API during setup might already be broken → report only observed unavailability and safe next steps, without asserting it was never started.
- Runtime settings and generated Compose defaults can drift → test native/compose validation against current runtime/template contracts and reject incompatible layouts explicitly.
- Compatibility probing through package-manager shims can have side effects → use fixed version probes with bounded capture and verify no project writes; never use installation commands.
- Modified managed operations guide affects generator output → refresh template version and affected deterministic snapshots without changing existing published alpha artifacts.

## Migration Plan

No schema migration, endpoint change or credential rotation. Ship CLI addition and guide updates through normal packaged builds; generated consumers can invoke `pnpm exec lace doctor --target node --mode compose --stage setup`. Keep root README creation and generated convenience scripts in 27B. Record the new template version for changed managed documentation and verify packed consumers. Rollback removes the added command/documentation; installation state needs no rollback because doctor never mutates it.
