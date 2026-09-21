## Context

See proposal.md. The existing `ContentUseCases.publish` result already contains
an entry, `published`/`replayed` outcome, and an independent dispatch outcome,
but the server discards the latter two and the admin client has no publish
operation. The current editor retains form values on generic failed saves, but
does not recognize revision conflicts or offer a deliberate recovery path.

## Goals / Non-Goals

**Goals:**

- Transport the existing portable publication result to the browser and render
  it alongside draft/published metadata.
- Keep a conflict-safe local form baseline with deliberate reload/copy choices.
- Make the admin-only publish command confirmed and retry-idempotent.

**Non-Goals:**

- No automatic merge, CRDT, draft history, publication scheduling, or preview.
- No site-build persistence, polling, history, retry UI, or completion signal;
  those are Step 13 work.
- No changes to application publication semantics, database schema, or roles.

## Decisions

### Publish a dedicated validated result rather than overload an entry DTO

`@lacecms/contracts` will add a strict publication-result DTO containing the
entry, `published`/`replayed` publication state, and the four dispatch states.
The server will map the use-case result through that DTO and the admin client
will validate it. Returning only the entry, as today, loses the dispatch state;
putting transient dispatch fields on every entry response would blur entry
state with command outcome.

### Derive editor facts from validated entry/model values

The editor will show the draft revision, `updatedBy`, and `updatedAt` directly
from the draft snapshot. It will derive a page path from model path and a
collection path by replacing the one route slug segment with the draft/published
slug under the same canonical route constraints already enforced server-side.
The published snapshot remains the source for public-output facts after a later
draft save. Build wording will describe only dispatch acceptance/pending and
never state that a generated site is live, because there is no build-status
read API yet.

### Model conflicts as an explicit non-destructive editor state

Save and publish mutations will recognize only the stable
`CONTENT_REVISION_CONFLICT` code. They will leave React Hook Form values and
dirty baseline intact, set a dedicated conflict state, and expose two actions:
reload via the existing validated `loadEntry` operation, or copy a deterministic
JSON serialization of the current complete draft. Reload only executes after a
button choice and performs a form reset from its validated response. Automatic
refetch/reset, retry, merge, and stale overwrite are rejected because none can
establish user intent.

### Scope a browser idempotency key to one confirmed publish attempt

On confirmation, the browser generates a non-empty opaque key and retains it in
component state while the operation is unresolved after a network error. A
retry reuses that key and the revision captured when confirmation began. A
received server response, including a domain/validation error, clears the key;
a new confirmation makes a new key. This follows the server's entry/actor/input
scope while avoiding accidental reuse for later content.

## Risks / Trade-offs

- [Clipboard permission or availability fails] → show a sanitized error and
  retain the local form; no recovery choice mutates values.
- [A retry captured against an obsolete editor state] → retain the captured
  revision/key only for that attempt and surface a server conflict instead of
  silently substituting new input.
- [Users infer dispatch acceptance means a completed deployment] → label the
  outcome as pending/unavailable/rejected/not dispatched and defer history and
  completion to Step 13.
- [Server/client transport change affects existing publish consumers] → add a
  distinct publish-result schema and update focused server/contracts tests in
  the same change.

## Migration Plan

Deploy contracts, server response mapping, and browser client/editor together.
Rollback can restore the entry-only endpoint/client in the same release unit;
publication data and snapshots remain unchanged because the use-case and
persistence contracts are not altered.
