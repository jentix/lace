## Why

Step 2 provides portable field descriptors and validation, but Lace still has no
typed, normalized model configuration from which a content structure or public
route can be determined. Session 3A establishes that deterministic model and
route foundation before the block registry and projections in Session 3B.

## What Changes

- Implement the Step 3, Session 3A configuration DSL in `@lacecms/config`:
  `definePage`, `defineCollection`, and `defineConfig`, preserving inferred
  field types and rejecting duplicate model keys.
- Require stable model keys and positive integer versions, with explicit,
  temporary `renamedFrom` metadata for later configuration synchronization.
- Validate and normalize page paths and collection route patterns, and expose
  deterministic collection-route resolution while rejecting unsafe or ambiguous
  route forms and fixed-path cross-model collisions detectable at startup.
- Normalize definitions into detached, deeply readonly plain data and calculate
  deterministic structural and projection hashes for each model and the overall
  configuration. Structural hashes exclude display metadata; projection hashes
  include it.

## Capabilities

### New Capabilities

- `content-model-configuration`: Typed page and collection configuration,
  safe route normalization/resolution, and deterministic configuration hashes.

### Modified Capabilities

- None.

## Impact

- Affects `packages/config`, which may depend on the public `@lacecms/content`
  field-definition API in accordance with architecture section 6.
- Adds public configuration and route APIs plus their runtime and compile-time
  tests; it does not add executable block definitions, runtime validators, admin
  projections, configuration synchronization, or persistence.
- Implements roadmap Step 3, Session 3A and architecture sections 8 and
  9.6, while preserving the accepted `field-descriptors` and
  `content-validation` specifications as inputs to the configuration DSL.
