## Why

Step 13, Session 13A needs a version-controlled project configuration entry point. The local Node API currently constructs hard-coded `home` and `posts` models, so a contributor cannot edit the project's content structure and see that definition in the development runtime.

## What Changes

- Add root `lace.config.ts` with editable home page and posts collection examples using the existing typed field and block definitions.
- Load the root module and normalize it before the Node development API starts; report a missing or invalid configuration as a startup failure.
- Document the relationship between model keys and routes, Astro-owned rendering files, and an API restart after configuration edits.
- Keep content synchronization explicit for Session 13B. This change does not add a sync command, create database models at startup, or add browser model creation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `node-api-composition`: The local Node entry point loads the root code-owned configuration before composing the API.
- `local-node-development`: The documented contributor workflow explains configuration edits, route ownership, and restart behavior.

## Impact

This implements roadmap Step 13A independently of 13B. It follows architecture §§4.3, 6, 7, and 8 and the accepted `content-model-configuration`, `configuration-synchronization`, `node-api-composition`, and `local-node-development` specs. Expected edits are the root configuration, `apps/api` development entry point and package dependencies, the temporary `packages/platform-node` development helper, focused startup tests, README, and Node development documentation. The existing configuration DSL and REST contracts remain intact. No database migration or external dependency is expected.
