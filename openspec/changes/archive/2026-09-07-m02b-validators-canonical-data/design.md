## Context

See [proposal.md](./proposal.md) for motivation and the
[content-validation requirements](./specs/content-validation/spec.md) for the
behavior contract. `@lacecms/content` currently exposes immutable portable
field descriptors and serializable metadata from Session 2A, but has no Valibot
dependency or submitted-content validation. Architecture sections 8 and 11
require the same content validation in Node and Cloudflare, with no raw runtime
schemas in the admin projection.

## Goals / Non-Goals

**Goals:**

- Keep field descriptors the sole input to static inference, serializable
  metadata, and runtime value schemas.
- Give later config, block, REST, and admin work portable validators for fields,
  entry-system data, safe rich text, payload limits, and deterministic hashes.
- Make errors consumable by forms through a normalized, path-aware issue shape
  rather than exposing validator-library internals.

**Non-Goals:**

- Defining models, routes, block schemas, media lookup, database persistence, or
  REST DTOs; these are later roadmap units.
- Validating a block's type/version/payload against a registry. This session
  validates only its top-level count and individual JSON byte size.
- Supporting tables, images, raw HTML, custom styling, arbitrary Tiptap
  extensions, or a rich-text renderer.
- Adding a Node-only hashing dependency or changing Session 2A's serializable
  metadata projection.

## Decisions

### Compile descriptors through one exhaustive dispatch point

`@lacecms/content` will add Valibot as a runtime dependency and expose a
descriptor compilation API whose result is a Valibot schema plus its inferred
value type. A public exhaustive visitor will receive a handler for every
`FieldDefinition["type"]`; compilation and any future consumers use it rather
than an unguarded switch. An `assertNever` fallback protects JavaScript callers
and the typed visitor makes a newly added discriminant a TypeScript error in all
handler maps.

Descriptor-specific validators retain the Session 2A constraints. Date values
will require real `YYYY-MM-DD` calendar dates; datetime values require valid UTC
ISO 8601 instants; media identifiers are non-empty strings. URL fields use the
same URL policy as links. Runtime defaults are validated by the compiled schema
and applied only by record-level validation so an individual field validator
continues to represent the submitted value itself.

Alternative considered: duplicate each builder's checks inside model validation.
Rejected because config defaults, form behavior, and future block data could
drift from the descriptor contract.

### Represent field and entry validation as explicit portable inputs

The package will provide record validation that accepts a plain field-definition
map and a mode (`draft` or `publish`). It will first reject non-object input and
unknown keys, apply descriptor defaults, then distinguish optional draft fields
from publish-required fields. Its result/error wrapper will expose normalized
segments such as field names and array indices, so a form does not need to parse
Valibot's evolving internal issue representation.

System payload validation will use a separate plain entry input containing the
model kind, title, optional slug, fields JSON, and ordered top-level block data.
This separates relational system fields from the model-defined field record,
matches architecture section 8, and lets this session enforce title, slug,
payload-byte, and block-count limits without prematurely inventing the Step 3
block registry API. Title is required for drafts; a slug is required only when
publishing a collection.

Alternative considered: wait for Step 3 models and blocks before exposing draft
and publish validation. Rejected because the roadmap explicitly assigns portable
validation and shared limits to Session 2B, and later model/block code needs a
stable validation foundation.

### Use a closed Tiptap tree and shared URL policy

Rich-text input will be checked as portable JSON and traversed with a closed
node/mark grammar. The confirmed MVP grammar allows `doc`, `paragraph`, `text`,
`heading` levels 1–3, `bulletList`, `orderedList`, `listItem`, `blockquote`, and
`hardBreak`; marks are `bold`, `italic`, `strike`, `code`, and `link`. Only a
heading `level` and link `href` attribute are admitted. The exported safe type
models that closed set so downstream renderers can narrow on known variants.

One shared URL predicate will accept absolute `https:`, `http:`, `mailto:`, and
`tel:` URLs, root-relative paths beginning with exactly one slash, and fragments.
It will reject protocol-relative URLs before URL parsing and reject all other
schemes and malformed values. This gives rich-text links and URL fields the same
security boundary without relying on browser-only DOM parsing.

Alternative considered: accept arbitrary Tiptap JSON and sanitize only while
rendering. Rejected because unsafe content could persist and reach every future
consumer before one renderer removes it.

### Canonicalize normalized JSON with Web Platform primitives

Canonical serialization will recurse over portable JSON: object keys are sorted
using the ECMAScript string ordering used in both target runtimes, while arrays
retain their original order. Strings are serialized with the native JSON string
escaping rules after portable JSON normalization. UTF-8 encoding uses
`TextEncoder`, and hashing uses `crypto.subtle.digest("SHA-256", bytes)` rather
than Node's `crypto` module. The digest is emitted as lowercase hexadecimal.

JSON-size validation measures those canonical UTF-8 bytes, giving Node and
Workers a single deterministic boundary for logically identical objects.
Committed fixtures will assert the canonical string and digest in the normal
Node test run and through a Worker-shaped Web Crypto/TextEncoder capability
fixture.

Alternative considered: use `JSON.stringify` insertion order and Node's
`createHash`. Rejected because insertion order changes hashes and a Node-only
API violates the portable package boundary.

### Preserve metadata-only exports

Valibot schemas, validation functions, Web Crypto capabilities, and normalized
errors remain runtime APIs. `toFieldMetadata` continues to return only detached
plain descriptor data, so a JSON round trip cannot carry a schema or executable
value. New exports are added through the package's declared public entry point;
no other package imports `packages/content/src` directly.

Alternative considered: attach a compiled schema to each normalized descriptor.
Rejected because that would make field metadata non-serializable and couple
config projections to executable runtime state.

## Risks / Trade-offs

- [Valibot issue shapes can change across releases.] → Normalize issues at the
  content public boundary and assert only the documented path/category contract.
- [A conservative Tiptap grammar excludes familiar formatting features.] → The
  confirmed allowlist is deliberately small; later additions require a reviewed
  descriptor, validator, and renderer update.
- [Web Crypto hashing is asynchronous.] → Expose asynchronous hashing rather
  than falling back to a Node-only synchronous implementation.
- [Canonical JSON work can be confused with field metadata.] → Retain the
  existing detached metadata projection unchanged and cover it with regression
  tests.

## Migration Plan

1. Add Valibot to the content package through the workspace catalog and keep its
   schemas internal to runtime exports.
2. Extend the content public entry point with validators, safe rich-text types,
   canonicalization, hashing, limits, and normalized errors.
3. Add focused runtime/type/portability fixtures, then run content-package and
   root quality gates plus strict OpenSpec validation.
4. Roll back by reverting the code-only package change; this session creates no
   persisted data, migration, or deployment state.
