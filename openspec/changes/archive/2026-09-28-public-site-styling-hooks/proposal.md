## Why

The reference Astro site renders five block types, but its HTML exposes no consistent selectors for a block type, a block instance, an entry, or semantic parts of a block. Site owners currently have to change render components or rely on fragile tag selectors to style the same block globally or differently on one page.

This is proposed roadmap Step 21.5, Session 21.5A, after the completed Step 21 and before Step 22. It is a small, independently verifiable site capability; the roadmap does not yet list this step and should be updated before implementation. It follows the code-owned presentation and user-owned `site/**` invariants in `docs/mvp-architecture.md` §§4.2–4.3, 7, 11, and 13, and extends the reference renderer behavior in `openspec/specs/astro-reference-site/spec.md`.

## What Changes

- Give every rendered entry a stable model and entry scope in public HTML.
- Give every rendered block a type and stable instance-key selector, and expose documented semantic part selectors for all five built-in renderers.
- Document and demonstrate global, model-wide, entry-specific, and block-instance CSS using those selectors and a site-owned global stylesheet.
- Add static-build assertions for selector presence, uniqueness, optional parts, and unchanged published-only rendering.
- Keep styling hooks in the Astro output. No content-schema, REST, SDK, database, or admin change is proposed.

No HTML `id` is added automatically: the existing block key is unique within an entry, while DOM IDs require document-wide uniqueness and imply anchor behavior. No editor-controlled CSS, classes, style values, visual variants, nested layout builder, or exact visual draft preview is in scope.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `astro-reference-site`: Specify stable public HTML styling hooks and their behavior across the current routes and built-in block renderers.

## Impact

- Public static HTML gains namespaced `data-lace-*` attributes and semantic part wrappers where rich text currently renders as a fragment; CSS selectors can target them without editing render components.
- Affected source is limited to `apps/site` layouts, routes, block components, fixture-build tests, and site-owner documentation. Existing page paths, block data, ordering, safe rich-text rendering, and build-export flow remain as specified in `openspec/specs/astro-reference-site/spec.md` and `openspec/specs/public-sdk/spec.md`.
- No new runtime dependency or persistence migration is required. The same static site works with Node and Cloudflare build exports.
