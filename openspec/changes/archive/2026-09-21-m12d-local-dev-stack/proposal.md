## Why

The delivered Node, MinIO, Astro, and admin pieces cannot yet be started as one
reproducible local development environment: the current Compose file starts
only MinIO, required runtime values are incomplete in `.env.example`, and the
documented `dev:node` gateway assumes already-running frontend servers. This
blocks the first real browser verification of the editor before the VPS build
work in Step 13.

## What Changes

- Implement roadmap **Step 12.5 — Local development environment** as one
  standalone session unit (`m12d-local-dev-stack`) between Steps 12 and 13.
- Define a Docker Compose development topology that starts the Node API,
  SQLite migration/bootstrap dependency, MinIO and its bucket initializer, the
  React admin dev server, and the Astro dev server with persistent local data,
  health checks, and no committed credentials.
- Provide documented root developer commands for starting, stopping, observing,
  checking, and deliberately resetting that topology; `dev:node` becomes the
  single supported entry point for the Node local-development workflow.
- Make the local environment explicit and safe through a complete `.env.example`,
  generated-or-operator-supplied local secrets, a first-admin bootstrap path,
  and a root README covering installation, operation, development, tests, and
  troubleshooting.
- Add a repeatable `dev:smoke` check that brings up an isolated development
  stack, waits for readiness, and proves that API, admin, site, and object
  storage are reachable; it cleans up only resources it created.
- Update the roadmap's dependency graph, unit count, and detailed sequence to
  record Step 12.5 without renumbering the accepted later milestones.

## Capabilities

### New Capabilities
- `local-node-development`: Reproducible, secure, full-stack Node/SQLite/MinIO
  local development lifecycle, developer commands, and smoke verification.

### Modified Capabilities
- `node-api-composition`: Make the existing `dev:node` same-origin gateway
  contract include its supported full-stack local-process lifecycle and clear
  development-upstream behavior.
- `workspace-governance`: Require the documented root local-development and
  smoke commands alongside the existing quality gates.

## Impact

- Affected operational files: `docker-compose.dev.yml`, `.env.example`, root
  `package.json`, development container/image assets, and `README.md`; the
  existing Node API development gateway, Admin, Astro, and Node runtime scripts
  may receive narrowly scoped dev-server changes.
- The change relies on the accepted Node API, authentication bootstrap,
  MinIO, Astro reference-site, admin-editor, and workspace-governance specs.
  It fulfills architecture §18's `dev:node` requirement and preserves the
  Node/SQLite/MinIO boundary in §§1, 4.5, and 15. It does not implement Step
  13's outbox, builder, release switching, or VPS production topology.
- No API contract, database schema, Cloudflare runtime, production credentials,
  or arbitrary-command execution is introduced.
