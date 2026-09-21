## Why

Session 12A lets writers edit metadata-driven scalar fields, but preserves the
ordered block snapshot as opaque data and exposes rich text only as JSON. Step
12, Session 12B makes those already-validated content structures practical to
author without weakening the shared safety boundary.

## What Changes

- Implement Step 12, Session 12B — Blocks and rich text — as the second,
  independently verifiable unit of the draft and block editor.
- Add an accessible block editor for a model's allowed registered block types:
  add, duplicate, remove, collapse, keyboard reorder, pointer/drag reorder,
  stable browser-generated ULID keys, and ordered snapshot saves.
- Replace the raw JSON rich-text control with a Tiptap editor constrained to
  the shared safe node, mark, and URL allowlist; raw HTML is not enabled.
- Expose a model's allowed registered block metadata through the existing
  validated model transport, then render generic block-field forms from it and
  add media-selection placeholders that list and choose from the Media API.
- Extend local validation and server-issue mapping so block data and rich-text
  errors remain associated with the affected controls before or after save.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `admin-draft-editor`: extend the draft editor with safe, ordered block
  authoring, constrained rich-text editing, media selection, and block-aware
  local/server validation feedback.
- `rest-contracts`: include a validated portable block-definition metadata
  projection in content-model responses so browser clients can render only
  model-allowed, registered blocks.

## Impact

- Affects `apps/admin` editor components, API client, styles, dependencies, and
  focused component/unit tests.
- Reuses the established `block-registry`, `content-validation`, and
  `media-use-cases`; extends the model-response contract and server projection
  with already-safe block metadata, without changing content lifecycle or
  persistence behavior.
- Depends on the architecture's sections 11 (block registry and rich text) and
  12 (REST API), the Session 12A draft baseline, the Step 9 Media API, and the
  existing allowed-block/configuration projections.
- Does not implement publication, conflict resolution, custom block-specific
  editors, media upload or management UI, autosave, server-side block changes,
  or Session 12C behavior.
