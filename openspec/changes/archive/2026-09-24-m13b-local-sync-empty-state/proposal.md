## Why

Step 13A made the root content configuration editable, but local SQLite remains unchanged until a contributor can invoke synchronization. Session 13B connects the existing portable planner and guarded Node apply path to the development workflow and explains an empty content screen.

## What Changes

- Add a local-only `pnpm content:sync` command that prints the plan, applies valid changes explicitly, and supports non-mutating `--check`.
- Keep startup and migration free of model synchronization. New pages receive one draft; collections receive no entries.
- Explain empty or unsynchronized models and API failures in `/admin/content` using available server information.
- Cover first, repeat, changed, and blocked sync behavior, the browser path, and contributor instructions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `local-node-development`: local command and deliberate contributor workflow.
- `admin-remote-state-and-lists`: content landing empty-state guidance and recovery.

## Impact

Step 13B depends on the accepted `configuration-synchronization` atomic and reporting contracts and Step 13A root config. Changes are limited to the local CLI wrapper, Node development composition, admin presentation/tests, and docs. It does not add HTTP TypeScript evaluation, Cloudflare CLI support, automatic startup sync, or Astro route generation. Architecture sections 4.3, 4.5, 4.8 and Step 13's session boundary remain intact.
