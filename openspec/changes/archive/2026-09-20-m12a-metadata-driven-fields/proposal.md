## Why

Step 11 supplies authenticated model and entry navigation, but an entry route is
still only a placeholder. Session 12A makes the existing serialized model
metadata actionable so editors can safely edit and save all non-block draft
fields with an optimistic revision guard.

## What Changes

- Implement Step 12, Session 12A — Metadata-driven fields — as the first
  independently verifiable part of the draft and block editor.
- Replace the protected entry placeholder with a metadata-driven draft form for
  every MVP field descriptor, keeping React Hook Form as the editable-value
  owner and compiling client-safe Valibot validation from the received metadata.
- Treat title, and collection slug, as explicit system fields; support opt-in
  title-to-slug suggestions that stop after a manual slug edit.
- Load a complete entry, protect dirty drafts from accidental in-app navigation,
  expose accessible local and server field errors and save state, and never
  autosave.
- Save the complete current draft in one revision-preconditioned `PUT`, then
  replace client state only with the validated response.
- Tighten the shared model metadata transport shape so the browser can validate
  the field descriptors it receives rather than treating them as arbitrary JSON.

## Capabilities

### New Capabilities

- `admin-draft-editor`: browser-admin editing of metadata-defined system and
  model fields, client validation, dirty-state protection, and complete-draft
  saves.

### Modified Capabilities

- `rest-contracts`: content-model metadata returned to browser clients is a
  validated serializable field-descriptor map rather than an unconstrained JSON
  object.

## Impact

- Affects `apps/admin` routes, browser API client, UI styles, and component
  tests; React Hook Form is added as the form-state dependency.
- Affects `packages/contracts` content-model DTO validation and the server's
  contract-backed admin model response.
- Depends on the field metadata and validation rules in `packages/content`, the
  normalized configuration projection, Session 7 REST draft endpoints, and the
  authenticated shell from Step 11.
- Does not implement blocks, rich text editing, media picking, publication,
  conflict recovery, autosave, or server-side lifecycle behavior changes; those
  remain in Sessions 12B and 12C or existing services.
