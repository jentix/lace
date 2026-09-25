## Context

See proposal.md. The server already owns user management, final-admin protection, token issue/revoke, and health readiness. The admin has a credentialed transport and guarded routes, but Users and Settings are placeholders.

## Goals / Non-Goals

**Goals:** Keep the browser a thin client of server authorization; provide useful local status; keep issued token secrets transient.

**Non-Goals:** Changing user persistence, password reset, token capabilities, or build dispatch.

## Decisions

- Add Valibot status DTO in `packages/contracts` and an admin-only route in `packages/server`. Readiness and configured-model count are sufficient for the local operator's immediate question: whether the API is ready and whether the config loaded models. Reuse the readiness probe and normalized config. The alternative of exposing environment details would leak private deployment data.
- Extend the existing `apps/admin` client with validated user/status/token methods and dedicated query keys. Components invalidate affected queries after confirmed mutations; they do not optimistically alter account or token state. API authorization remains decisive.
- Hold the newly issued token only in Settings component state, never a query cache or storage. Clear it on dismissal and component unmount. Clipboard copy is an explicit user action. Listing uses the metadata-only contract.
- Reuse the existing shell sign-out mutation and expose it in the main header for narrow layouts; remove the redundant sidebar placement. Add an index route redirect beneath the guarded route so `/admin/` follows the same session policy.

## Risks / Trade-offs

- [A rejected final-admin action can produce a generic server error] → Show the API error without changing confirmed list state; improve the server's error mapping if tests show an opaque failure.
- [Clipboard retains a user-copied token outside the app] → Copy only on explicit activation and explain that the value cannot be retrieved later.
- [Readiness can change immediately after display] → Query on each Settings visit and provide manual refresh.

## Migration Plan

No schema migration. Deploy shared contracts and server with the admin bundle; rollback restores the placeholder screens without changing stored users or tokens.
