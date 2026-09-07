## Why

Session 2A establishes portable field descriptors, but the CMS still lacks the
runtime validation and deterministic representation required to safely save,
publish, compare, and hash content across Node and Cloudflare. Session 2B adds
that shared behavior before models and blocks build on the DSL.

## What Changes

- Add Valibot compilation for every existing field descriptor, driven by an
  exhaustive field-definition visitor.
- Add model-field validation in explicit draft and publish modes, including
  unknown-key rejection, defaults, required-field behavior, and stable
  path-aware validation issues.
- Add a safe shared Tiptap document type and validation of the documented node,
  mark, attribute, and URL-protocol allowlists.
- Add portable canonical JSON serialization and a Web Crypto-compatible SHA-256
  helper for canonical UTF-8 bytes.
- Export the shared title, slug, JSON-size, and top-level-block constants, plus
  validators that enforce the limits assigned to this layer.
- Cover the public API with focused runtime, type-level, Node, and Worker-like
  tests while keeping form metadata free of executable schemas.

## Capabilities

### New Capabilities

- `content-validation`: Portable compiled field schemas, draft/publish content
  validation, safe rich-text validation, canonical JSON, content limits, and
  deterministic hashing.

### Modified Capabilities

- None. `field-descriptors` is implemented by the completed but not yet
  archived `m02a-field-descriptors` change; this session consumes its public
  descriptor contract without changing its existing requirements.

## Impact

- Implements roadmap Step 2, Session 2B only, following architecture sections
  4.5, 6, 8, and 11.
- Extends `@lacecms/content` with Valibot as an internal runtime-validation
  dependency and new portable public exports; no database, REST handler,
  content-model, block-registry, or runtime-adapter behavior is introduced.
- Provides contracts needed by the Step 3 configuration/block work and later
  REST/admin consumers; it preserves the architecture's Node/Worker portability
  and does not serialize Valibot schemas or callbacks.
- Depends on Session 2A's completed descriptor implementation. Its independent
  acceptance/archival lifecycle remains unchanged.
