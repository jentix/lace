## Why

The public SDK introduced in Session 10A gives static-site builds a validated
published-content boundary, but the reference Astro site is still only a
TypeScript package identity. Session 10B makes that boundary executable and
proves that the starter site can be rendered deterministically from one
published build export.

## What Changes

- Replace the `apps/site` placeholder with an Astro static-site fixture for the
  starter `home` and `posts` configuration, including home and blog routes.
- Expand both starter models to permit every built-in block and advance their
  model versions so the reference fixture can exercise the complete starter
  block vocabulary in published routes.
- Add deterministic build-data loading that reads one authenticated SDK build
  export in live mode or a committed export fixture in offline/CI mode, then
  derives all routes and entry data locally.
- Render all five built-in blocks (`hero`, `richText`, `image`, `quote`, and
  `cta`) and render the shared safe Tiptap subset through an Astro allowlist.
- Fail a build deterministically for an unrenderable block and identify its
  model, entry, and block keys; do not silently omit it.
- Add fixture-driven build verification for route generation, published-only
  output, stable media URLs, and non-rendering of unsafe rich-text payloads.

## Capabilities

### New Capabilities

- `astro-reference-site`: The static starter-site fixture that consumes one
  published build export, renders the starter models and built-in blocks safely,
  and can build without CMS access from a committed fixture.

### Modified Capabilities

- None.

## Impact

- Affects `apps/site`, its package scripts and dependencies, fixture/test
  assets, its documentation, and the starter config fixture; it consumes
  `@lacecms/sdk` and shared public contracts without importing server,
  application, database, or auth internals.
- Does not change API routes, the configuration DSL, draft/publish semantics,
  public SDK transport behavior, build dispatch, or deployment orchestration.
- Implements roadmap Step 10, Session 10B, consistent with architecture
  sections 2, 3.2, 4.2, 4.7, 5, and 6; it builds on the archived Session 10A
  `public-sdk` capability and the accepted `block-registry` and
  `content-validation` requirements.
