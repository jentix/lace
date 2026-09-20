## Context

See [proposal.md](./proposal.md) for motivation. The Session 11A admin app
already owns the route tree, role-gated shell, accessible primitives, and a
small same-origin session source. Its login, content, and model routes are
placeholders. The Node/Cloudflare-parity REST surface already provides shared
Valibot contracts for model projections, cursor entry lists, content entries,
and error envelopes; Better Auth owns `/api/auth/*` browser sessions.

## Goals / Non-Goals

**Goals:**

- Keep all browser HTTP semantics and shared-contract parsing in one admin
  boundary rather than spreading `fetch` calls through route components.
- Make query identity and invalidation explicit for session, model projection,
  and collection-entry list data.
- Preserve server authorization as the decision point while using known role
  information for useful, accessible affordances.

**Non-Goals:**

- This change does not add server endpoints, alter content contracts, create an
  admin editor, or implement publish/conflict/media/build/user-management UX.
- It does not introduce browser persistence, optimistic mutation updates, or a
  custom authentication protocol.

## Decisions

### A narrow, schema-validating admin client owns transport behavior

`apps/admin` will add a browser client that always uses `credentials:
"same-origin"`, validates each successful `/api/v1/admin/*` response with the
corresponding `@lacecms/contracts` schema, and produces one typed client error
for malformed payloads, transport failures, and documented API errors. The
error keeps sanitized message/code/status and the `x-request-id` header for
technical details only. Authentication calls remain at Better Auth's existing
same-origin endpoints but use the same credential and error policy.

This avoids importing server code into the browser and prevents individual
components from trusting arbitrary JSON. Direct `fetch` calls in each component
were rejected because they duplicate credential, parsing, and failure handling.

### React Query owns remote data; routes continue to own access boundaries

The app will provide a single `QueryClient` and stable key factories for
session, content models, and entry-list pages keyed by model key and opaque
cursor. Content screens use query hooks for loading/empty/error/populated
rendering. Router `beforeLoad` remains the no-protected-flash guard, reading a
session-source façade that can be invalidated after authentication transitions.

Successful sign-in refreshes the session and redirects through `safeReturnPath`.
Successful sign-out clears/invalidate all remote state before navigating to
login. Successful create/delete invalidates the affected collection list and
model projection; failures retain current UI data and expose the mapped error.
An authenticated-route request that conclusively indicates session expiry
clears those caches and routes to login. Authorization-denied responses remain
visible as authorization failures, rather than being misclassified as expiry.

Router loaders alone were rejected because they do not offer the mutation,
pagination, and controlled cache lifecycle needed here. A global request
interceptor was rejected because it would couple routing side effects to a
transport module and could redirect on ordinary authorization errors.

### Model projection drives content navigation and list shape

The content landing query partitions the existing model projection by `kind`.
For each page model, the client resolves the existing singleton through the
entry-list endpoint and links its summary to `/content/:modelKey/:entryId`.
Collection models link to `/content/:modelKey`. The collection route keeps API
cursors opaque and renders a keyboard-operable next-page action when a next
cursor exists; it does not query collection pages when building page-editor
links.

Entry creation is limited to collection models and uses an accessible dialog to
collect the required initial title, then sends empty fields and blocks through
the existing draft-permissive contract. Deletion uses the summary's draft
revision and a Dialog confirmation before its API mutation. The UI hides these
controls from `viewer`, but every mutation still goes to the existing API that
authorizes independently. Client-side role enforcement was rejected as an
authorization boundary because roles can become stale and cannot protect direct
HTTP calls.

## Risks / Trade-offs

- [A session can expire after route guard resolution] → Classify only conclusive
  authentication failures as expiry, clear stale caches, and return to login;
  retain non-session authorization errors for user-visible handling.
- [A configured model can change while the browser has cached navigation] →
  Invalidate the model projection after successful entry mutations and use
  explicit query errors rather than rendering cached data as authoritative.
- [No editor exists yet to collect required initial fields] → Creation uses only
  the server's existing draft-permissive contract; publishing and full editing
  remain Session 12 work.
- [Cursor pagination can duplicate or move data between requests] → Render API
  response pages in order without decoding cursors or claiming a stable total.

## Migration Plan

The change is a browser bundle update with no database, API, or persisted client
state migration. Deploy the updated admin assets through the existing API/admin
composition root; rollback is restoring the preceding assets, which returns
the shell to its Session 11A placeholders without changing server data.
