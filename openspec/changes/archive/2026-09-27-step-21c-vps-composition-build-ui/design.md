## Context

See proposal.md. The 21A repository already persists build rows and leased work; 21B supplies a fixed-command builder. The Node API currently starts only a media-deletion loop, and `/builds` is a placeholder. The Hono app accepts an `adminAssets` responder but the Node runtime does not yet bind one. The architecture lists `/api/v1/admin/site-builds` while 21A already shipped write routes under `/api/v1/admin/builds`; this change uses the architecture's path for reads and preserves existing write routes for compatibility.

## Goals / Non-Goals

**Goals:** Keep publication and build execution in separate processes; serve admin and static output through one public origin; expose durable build records without raw logs or secrets; retain the fixed builder request shape.

**Non-Goals:** New database columns, asynchronous provider callbacks, Cloudflare runtime, generated-project templates, TLS certificate automation.

## Decisions

1. A single API image runs either the HTTP entrypoint or a dispatcher entrypoint under Compose. The dispatcher opens the same SQLite volume and polls build and media-deletion work. API and worker have separate lifetimes; SQLite claims remain conditional. This avoids an in-process build loop and duplicate mutable queues.
2. The Node image contains the compiled API and admin bundle. The API's existing `adminAssets` port serves `/admin/` and its SPA fallback. A static reverse proxy routes `/api`, `/health`, and `/admin` to the API and serves `/` from the read-only output volume's `current` release. The builder alone writes the output volume. A proxy-served admin bundle was considered, but would split the owned admin asset boundary.
3. Production Compose runs one-off migration and MinIO bucket initialization before API/worker readiness. Named SQLite, object, and output volumes survive replacement. Builder and MinIO listen only on internal networks. The source mount is read-only and fixed at the repository reference project until Step 23.
4. The application uses a narrow build-read port, implemented by the SQLite repository. REST DTOs expose bounded newest-first rows and optional lifecycle fields. The API authenticates all reads and validates the DTO; only existing actor-checked commands mutate work. A new read path follows architecture, while shipped command paths stay stable.
5. The Builds page uses the existing query client, session recovery, shared states, and theme primitives. Selection of a row reveals full detail without exposing raw IDs as the primary label. Administrators see request/retry controls; editor and viewer roles can inspect only.

## Risks / Trade-offs

- [SQLite shared by API and dispatcher] → WAL and short conditional transactions already protect claims; each process uses its own connection and the integration test terminates/restarts the worker.
- [Build token is required at container startup] → provision the once-shown token through the documented environment before starting production; avoid writing it into tracked Compose files.
- [First static release absent] → proxy returns a controlled unavailable page until a manual or publication build succeeds; health checks distinguish live proxy from a ready release.
- [Current release is a symlink on a shared volume] → proxy follows it at request time; only the builder can replace it after a complete build.

## Migration Plan

Build images, provision environment, run Compose migration and bucket initialization, start the API/dispatcher/builder/proxy, then request the first build. Existing SQLite data needs no schema migration. Roll back by restoring the prior image/Compose while retaining named volumes and the previous successful release.
