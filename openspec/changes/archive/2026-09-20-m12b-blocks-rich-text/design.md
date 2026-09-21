## Context

See `proposal.md` for motivation and the delta specifications for behavior. The
Session 12A editor owns one React Hook Form aggregate and already saves an
ordered `ContentBlockDto[]`, but displays rich-text JSON in a textarea and has
no block controls. The model DTO currently exposes allowed block type strings
without their portable metadata, although `@lacecms/content` and
`@lacecms/config` already produce detached `BlockMetadata` projections.

## Goals / Non-Goals

**Goals:**

- Preserve one complete-draft form and Session 12A's response-only reset rule
  while making ordered blocks and rich-text values safely authorable.
- Pass only portable metadata into the browser, retaining the server registry
  as the authoritative aggregate validator and position canonicalizer.
- Make block mutations, media selection, and validation feedback accessible and
  testable without adding a block-specific React API.

**Non-Goals:**

- No persistent schema, configuration-sync, application command, or content
  validation semantic changes.
- No custom block UI extension point, raw HTML editing/import, media upload or
  library-management route, autosave, publication UI, or automatic conflict
  merge.

## Decisions

### Extend the model projection with allowed block definitions

`ContentModelDto` will retain its existing `blocks` type-key list and gain a
validated `blockDefinitions` array. Each entry is a portable `BlockMetadata`
shape (stable type, schema version, optional display text/default data, and
field metadata), filtered and ordered by the model's allowed block keys. The
server configuration boundary will receive the already-detached global block
metadata projection alongside models and derive the per-model list before
validating its response through the shared contract. The admin will reject
metadata that is malformed, duplicated, or does not correspond exactly to the
model's allowed keys.

Keeping the type list preserves current clients and configuration semantics,
while the added projection gives generic forms exactly the safe information
they need. Reconstructing block fields in the SPA would duplicate configuration
and importing the runtime registry would violate package boundaries.

### Make blocks first-class nested React Hook Form values

The editor will factor metadata form controls into reusable primitives that
accept a typed form path. The existing model fields use `fields.<key>` and
block data uses `blocks.<index>.data.<key>`. A block editor keeps the array in
React Hook Form through `useFieldArray`; add/duplicate operations make detached
data copies, allocate a new ULID, and allocate a sparse local position. Remove,
collapse, keyboard move controls, and a pointer drag/sortable interaction all
use the same array move operation, so display and submitted order cannot
diverge. Collapse is UI-only state keyed by stable block key.

The browser does not canonicalize positions. It retains sparse positions while
editing and transmits the current array order; the server's returned snapshot
becomes the sole canonical baseline after save. A plain native drag API was
considered, but an accessible sortable implementation with explicit keyboard
support has a smaller behavioral gap across mouse, touch, and keyboard input.

### Compile client validation from portable block metadata

`editor-form.ts` will add a browser-safe aggregate validator that checks block
key format and per-snapshot uniqueness, allowed type/version correspondence,
unknown data fields, and present metadata field values. It will reuse
`@lacecms/content` field and rich-text validation so unsafe links and malformed
documents fail before network submission while draft mode continues to permit
missing required fields. JSON Pointer mapping will extend to block-data paths
and return a safe form path only for the loaded validated metadata.

This provides prompt feedback without claiming browser authority: aggregate
limits, configuration races, registry semantics, canonical positions, and all
persisted validation remain server-owned.

### Use explicit Tiptap extensions for the shared allowlist

The admin will add Tiptap React/core packages and explicit extensions only for
`doc`, `paragraph`, `text`, heading levels 1–3, bullet/ordered lists,
`listItem`, blockquote, hard break, and bold/italic/strike/code/link marks.
The Link extension will use the shared URL predicate; no HTML parsing or raw
HTML extension is installed. Rich-text controls convert editor updates to JSON
and validate the resulting document before updating their form value, showing
the same accessible field-error mechanism as other controls.

An unconfigured starter bundle was rejected because its extra extensions could
expand the stored document subset beyond the architecture's allowlist.

### Treat media selection as a reusable, non-mutating picker placeholder

The admin client will add a validated paginated media-list operation. A generic
metadata media control loads it on demand through TanStack Query, renders active
choices with filename and safe URL preview/metadata, and writes only the chosen
media ID into its bound form path. Loading, empty, and failed results are
visible states; no upload or lifecycle action is added. Existing saved media
values remain visible even when no longer selectable.

## Risks / Trade-offs

- [Tiptap or drag extensions can emit a structure outside the safe subset] →
  use explicit extensions and validate JSON at the form boundary with focused
  tests for unsupported nodes, attributes, and URLs.
- [Index-based field paths can move errors to the wrong block after reorder] →
  perform mutations through one field-array operation and map server issues to
  the current rendered index only at the time the error is received.
- [Model metadata and block registry could become inconsistent] → validate the
  model response's allowed types, uniqueness, and metadata correspondence at
  the contracts/browser boundary; server aggregate validation remains final.
- [Media browsing can be slow or unavailable] → fetch only when needed, show
  status explicitly, and leave the draft value untouched on errors.

## Migration Plan

The new optional model-response `blockDefinitions` property is deployed with
the server mapper and admin client. Rollback removes the SPA controls and
projection together; saved snapshots remain compatible because their existing
block type, version, key, data, and position structure is unchanged.
