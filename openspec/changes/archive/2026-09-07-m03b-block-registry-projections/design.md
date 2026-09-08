## Context

See `proposal.md` for motivation. `@lacecms/content` already owns portable field
descriptors, canonical JSON, and draft/publish field validation; `@lacecms/config`
owns normalized model routes and hashes. Session 3A leaves model `blocks` as a
detached list of keys and the entry validator only enforces generic JSON data.
Architecture sections 8, 9.4--9.5, and 11 require versioned registry-backed
block validation without introducing Node-only code or SQL behavior.

## Goals / Non-Goals

**Goals:**

- Add a public, portable content-package block DSL and registry that reuses the
  existing field DSL/validator and preserves compile-time data inference.
- Make `defineConfig` build one detached registry, validate every model's
  declared block type, and create separately typed runtime and JSON projections.
- Validate a whole submitted entry as one aggregate, retaining stable,
  path-addressable validation failures and current payload bounds.

**Non-Goals:**

- Block persistence rows, sparse-position management, schema migration
  execution, media-reference projections, REST contracts, or UI rendering.
- Custom executable block editors and serializing Valibot schemas or arbitrary
  migration functions into the public projection.

## Decisions

### Keep definition, runtime, and metadata surfaces deliberately separate

`defineBlock` will normalize portable declarative inputs into deeply frozen
metadata and compile field validators from the existing content API. A registry
will retain compiled validators for runtime lookup while a metadata projection
is reconstructed from detached data. This prevents functions from crossing the
admin/public boundary. A single mixed object was rejected because accidental
JSON projection of validator internals would be too easy. Type-key validation
will match the existing model block-key grammar, preserving the architecture's
camel-case `richText` built-in rather than imposing a kebab-case-only rule.

### Use current-version registry resolution for the MVP

The registry will index one current definition per block type and reject another
registration for the same type, including the same type/version pair. Aggregate
validation requires the submitted schema version to equal that current version.
Architecture permits future block-local migration functions, but executing or
selecting older versions is deferred: configuration sync must never silently
transform stored content.

### Extend configuration at the composition boundary

`defineConfig` will accept block definitions alongside content models, normalize
the registry before hash construction, reject unknown allowed block types, and
include serializable registry metadata in configuration identities. It will
return a runtime projection with validators and a public projection with only
JSON-safe metadata. Retrofitting validation into `definePage` was rejected
because a standalone model cannot know the root registry.

### Validate aggregate inputs through composable existing validators

The content package will add a model-and-registry-aware aggregate validator that
first applies system limits, then validates model fields and every ordered block.
It will use `validateModelFields` for both field maps, preserving draft/publish
default semantics, and use canonical JSON sizing per block. A separate
block-specific validation implementation was rejected because it would diverge
from field rules and violate the public-DSL-only built-in requirement.

## Risks / Trade-offs

- [Changing generic block payload input may affect no current external caller
  but broadens exported types] → retain shared system limit helpers and add
  focused negative tests for each newly required block property.
- [Serializing registry metadata changes configuration hashes] → define the
  complete public projection once and snapshot the architecture fixture through
  canonical serialization.
- [No automatic older-version migration] → reject stale versions deterministically
  until a separately reviewed migration capability is implemented.

## Migration Plan

This is the first executable block registry and no database data exists. A
consumer adds `blocks` to its root `defineConfig` input and adopts the new
runtime/public projections. Reverting removes the public DSL and restores the
Session 3A configuration-only behavior; no persistence migration is required.
