## Why

Roadmap session 21C completes the Node/VPS build path begun in 21A and 21B. Builds are durable, but operators cannot yet inspect them in the admin, and the repository has no production composition or independent recovery worker.

## What Changes

- Add a production Docker Compose stack for the API, MinIO, builder, recovery dispatcher, and static reverse proxy, with persistent data and private service networks.
- Move production outbox polling into a separate process so API restarts cannot strand work.
- Expose authenticated build history and detail, then replace the `/builds` placeholder with status, target version, provider ID, timestamps, sanitized errors, request, and retry controls.
- Verify coalescing, serving a successful release, failure retention, and retry in an integration scenario.

## Capabilities

### New Capabilities

- `vps-composition`: production service topology, persistence, health, and independent dispatch.

### Modified Capabilities

- `site-build-dispatch`: administrator history and detail reads of the durable build lifecycle.
- `hono-app-factory`: authenticated build read routes and their contracts.
- `admin-application-shell`: working Builds screen replacing its placeholder.

## Impact

Touches `docker-compose.yml`, production images/configuration, Node process entrypoints, build repository and REST contracts, the layered admin, and integration tests. Depends on 21A outbox and 21B fixed-command builder. Follows architecture §§5, 9.8, 12, 16 and the session 21C roadmap. Generated-project packaging remains in Step 23; Cloudflare dispatch remains in Step 22.
