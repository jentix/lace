## Context

The Step 11 entry route is a protected placeholder. The API already provides
model metadata, entry loads, and complete-draft saves, but the contract models
the field map as arbitrary JSON and the admin client neither loads entries nor
saves them. `@lacecms/content` already owns portable field metadata and draft
validation; the architecture permits `apps/admin` to depend on both contracts
and content.

## Goals / Non-Goals

**Goals:**

- Turn validated model metadata into an accessible, local-first field editor
  while preserving the server as the lifecycle and canonicalization authority.
- Keep the draft request atomic from the browser: one full aggregate plus the
  revision that was loaded or returned by the previous save.
- Establish reusable editor primitives without deciding block, Tiptap, media,
  publication, or conflict workflows reserved for later Session 12 units.

**Non-Goals:**

- No block mutation, block rich-text editor, media picker, publication control,
  automatic conflict merge, autosave, persistence migration, or API endpoint
  addition.
- No duplication of server configuration or executable validation in response
  metadata; the browser compiles only validated portable descriptors.

## Decisions

### Treat contract metadata as a closed portable field union

`packages/contracts` will define runtime schemas and DTO types for all field
descriptor variants, their common display/required/default properties, and
their type-specific constraints. `contentModelSchema.fields` will use that
field map instead of generic JSON. The server will keep mapping normalized
configuration metadata through the shared DTO converter, and admin requests
will reject malformed model metadata before render.

This makes the existing serialized configuration projection a reliable browser
boundary. Re-exporting server configuration types or trusting arbitrary JSON
would couple the SPA to startup code and lose runtime validation at the
network boundary.

### Keep React Hook Form as the editable aggregate owner

The admin package will add React Hook Form and use one form value shape for
system fields, model fields, and the currently preserved block array. A local
resolver will compile every validated field metadata descriptor to the
client-safe draft rules in `@lacecms/content` and map its path-aware issues to
React Hook Form errors. A field-renderer registry keyed by descriptor type will
render every MVP field type. The registry will receive only metadata, form
registration/control APIs, and error/display state; it will not receive
executable configuration callbacks.

Using bespoke per-field `useState` would make a complete snapshot save,
validation paths, and dirty tracking fragile. A server round trip as the only
validator would delay basic feedback and cannot provide the stated no-request
local validation behavior.

### Model the system fields separately from configured fields

Title is a required form control outside the metadata map. Slug is added only
when the loaded entry's model is a collection. A local slug-suggestion state
tracks user opt-in and whether the slug has been manually edited; the
suggestion is deterministic, produces a canonical ASCII slug candidate, and
never overwrites a manual value. It is a browser convenience only, so the
normal complete-draft endpoint remains authoritative for slug validation.

This avoids treating title/slug as user-defined configuration and retains the
page-versus-collection distinctions established by the domain and REST
contracts.

### Use query data as the saved baseline, never as live editable state

The entry route will fetch models and entry data with TanStack Query, verify the
entry model matches the route model, then reset the form only on its first
successful load and after a successful validated save. The form's dirty flag is
the source for unsaved-change warnings. The save mutation sends a complete draft
using the current baseline revision, invalidates entry-list summaries as needed,
and resets from the returned entry only after its shared contract is validated.
Failed mutations—including server validation errors—leave form values intact;
the client maps documented JSON Pointer issues to system or model fields.

Directly binding controls to query data would let refetches overwrite local
edits. Optimistically advancing a revision would violate the server response as
the canonical draft representation.

### Guard both SPA transitions and document unload

The entry editor will use router navigation blocking for dirty route exits and
the browser `beforeunload` safeguard for refresh/close. The SPA prompt provides
an accessible explicit stay-or-leave choice and is removed on successful save
or explicit discard. The native unload message is only a fallback because
browsers constrain its text and interaction.

Relying solely on `beforeunload` would not protect links handled by the client
router; relying solely on an SPA dialog would not cover reload or tab close.

## Risks / Trade-offs

- [Client and server validation can drift as descriptors evolve] → compile
  browser rules from the shared content package and add table tests for every
  descriptor plus contract rejection tests for malformed metadata.
- [Route/query refetch can replace unsaved values] → reset only after initial
  load or successful save, and retain dirty form state across ordinary renders.
- [Browser unload prompts are not fully controllable] → use the platform prompt
  only as a fallback and make the in-app confirmation the primary interaction.
- [Rich-text and media controls need richer UX] → render all descriptor types in
  the registry now, while reserving Tiptap and media-picker integration for 12B.

## Migration Plan

No persisted data or endpoint path changes are required. Deploy the tightened
model DTO contract together with the server mapper and admin client; rollback
reverts the SPA and contract implementation as one versioned workspace change.
