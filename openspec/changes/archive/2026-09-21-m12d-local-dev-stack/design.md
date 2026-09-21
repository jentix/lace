## Context

See `proposal.md` for motivation and the delta specs for observable behavior.
Architecture §18 already requires one `dev:node` workflow to start the Node
API, SQLite, MinIO, Admin, and Astro. Today `docker-compose.dev.yml` owns only
MinIO; `apps/api` has a gateway that assumes two upstreams already exist;
`apps/site` lacks a development command; and no root command or README provides
a first-run path. Step 13 has a different responsibility: it produces the
private VPS builder and atomic static-release topology.

## Goals / Non-Goals

**Goals:**

- Make a clean, configured checkout runnable as one local browser stack without
  installing Node, SQLite, or MinIO directly on the host beyond Docker and the
  documented pnpm prerequisite.
- Preserve host source editing and frontend development-server feedback while
  isolating container-native dependencies and persistent local state.
- Make migrations, MinIO bucket creation, health gates, first-admin bootstrap,
  smoke validation, and teardown explicit and repeatable.
- Keep the browser on the API gateway origin so Better Auth cookies and API
  requests retain the architecture's same-origin boundary.

**Non-Goals:**

- Implement `site.build.requested`, the VPS builder, reverse proxy, immutable
  release serving, or any Step 13 behavior.
- Provide Cloudflare local development, a production Compose deployment, a
  general-purpose command runner, default credentials, or a database seed of
  real content.
- Delete, modify, or inspect a contributor's Docker resources outside the
  explicitly named Lace development project and its named volumes.

## Decisions

### Use a dedicated development Compose topology with a fixed, narrow lifecycle

`docker-compose.dev.yml` will own six service roles: MinIO, one-shot bucket
initialization, one-shot SQLite migration, API gateway, Admin Vite server, and
Astro server. The API depends on successful migration and bucket initialization
and its own storage preflight; the visible Compose health conditions describe
the actual startup order rather than a sleep interval. SQLite and MinIO data
use explicitly named development volumes. Source code is bind-mounted into
development containers, while container-native dependency directories use named
volumes so host platform modules (notably `better-sqlite3`) are not reused in a
Linux container.

The root lifecycle commands wrap this one file with a fixed `lace-dev` project
name: `dev:node` attaches to startup, `dev:stop` stops without removing data,
`dev:logs` follows the same project, and `dev:reset` is the only destructive
operation. Its implementation will require an explicit confirmation argument
before `down --volumes` targets only the known Lace development project.

Alternatives considered:

- Host-only Node processes plus a MinIO container: rejected because first-run
  prerequisites and platform-native dependencies remain inconsistent.
- Reusing the future Step 13 production Compose file: rejected because the
  builder/release topology is not development infrastructure and would couple
  first-run validation to unimplemented production behavior.
- One opaque script that embeds Compose YAML: rejected because health checks,
  ports, volumes, and secrets must remain reviewable as declarative operations.

### Route browser traffic through the Node gateway and preserve development upgrades

The API continues to own `/api/*` and `/health/*`; `/admin/*` maps to the Admin
development service and remaining frontend paths map to Astro. The Node gateway
will explicitly bridge the supported frontend upgrade connections in addition
to ordinary HTTP proxying, so development-server behavior works through the
single browser origin. Admin and Astro add their normal development scripts and
listen on container-reachable development interfaces; the browser receives only
the documented host API origin, never Docker DNS names or MinIO endpoints.

Alternatives considered:

- Open Admin and Astro ports to the browser and add each frontend's own API
  proxy: rejected because it weakens the accepted single-origin setup and
  duplicates proxy behavior.
- Serve production-built frontend artifacts: rejected because it hides the
  development lifecycle and is Step 13's release concern.

### Treat migrations and bootstrap as separate, guarded operations

The migration service runs the existing forward-only migration command against
the development SQLite volume and must finish before API startup. It does not
run configuration synchronization, which remains an intentional operator
operation under the accepted synchronization contract. A new local developer
bootstrap command opens only the configured local database through the existing
Node security boundary, mints the existing one-time setup token, writes only its
hash, and prints the plaintext token once. README instructions use that token
with the existing setup-admin endpoint before browser sign-in. No credential is
seeded in Compose or persisted in tracked files.

Alternatives considered:

- Insert an admin user directly with SQL: rejected because it bypasses the
  reviewed bootstrap protocol and password handling.
- Wait for Step 15's public CLI: rejected because it leaves the editor
  untestable during Steps 12.5–14; the local wrapper is intentionally not a
  replacement for the future portable CLI command.

### Make smoke testing isolated and non-destructive

`dev:smoke` will generate a temporary environment file and a unique Compose
project name, wait with bounded polling for API readiness and the Admin, Astro,
and MinIO surfaces, and use only safe HTTP status/body assertions. Cleanup is
registered before startup and removes that unique project's containers, network,
volumes, and temporary environment file on success, failure, or interruption.
It never invokes the fixed development project's reset command and never
attempts an authenticated content mutation.

Alternatives considered:

- A one-time manual checklist: rejected because it would decay and cannot prove
  a clean first run.
- Reusing persistent `lace-dev` data: rejected because prior migrations,
  buckets, or users can conceal first-run failures and cleanup could destroy
  contributor data.

### Keep developer documentation at the repository root

The root README becomes the entry point for prerequisites, `.env` creation,
normal lifecycle, local URLs, migration/bootstrap boundaries, test/quality
commands, and failure diagnosis. Specialized Node API, migration, and auth
documents remain detailed references and will link back to the canonical first
run instead of maintaining conflicting command sequences. `.env.example` lists
placeholders and safe local defaults only where a value is not secret.

## Risks / Trade-offs

- [Docker file watching can vary by host filesystem] → expose documented
  polling/watch configuration where required and cover service availability in
  smoke tests; source mutation itself remains a manual developer-loop check.
- [A stale development volume can hide migration or setup problems] → preserve
  data by default but document and guard an explicit reset; smoke always uses
  fresh isolated volumes.
- [Gateway upgrade proxying has lower-level Node lifecycle concerns] → add
  focused gateway tests for namespace selection, ordinary upstream failure, and
  supported upgrade forwarding, including shutdown cleanup.
- [A local bootstrap command handles a secret] → print only once to the local
  terminal, never write plaintext to files or logs, and rely on the existing
  expiry/hash-only bootstrap implementation.
- [Container dependency caches can become stale after manifest changes] → make
  the documented start path rebuild/reinstall when workspace manifests or the
  lockfile change, and document the narrow cache-reset recovery step.

## Migration Plan

1. Add the development container assets, Compose topology, full environment
   example, root lifecycle scripts, app development scripts, bootstrap helper,
   and gateway upgrade support; retain the existing `docker-compose.dev.yml`
   filename as the development topology.
2. Update root and focused operational documentation, including a migration note
   that the development stack applies only committed forward migrations and does
   not erase state during normal stops.
3. Add deterministic script/gateway tests and the isolated Docker smoke command;
   run it on a clean local project name, then run all required root quality and
   OpenSpec checks.

Rollback removes the new developer assets and commands only after containers
are stopped. Existing local SQLite/MinIO data is not automatically removed; a
contributor may retain it for a later compatible change or explicitly invoke the
documented local reset.
