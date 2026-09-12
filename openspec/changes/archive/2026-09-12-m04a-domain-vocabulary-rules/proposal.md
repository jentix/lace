## Why

The model configuration and portable content validation from Steps 2 and 3
describe content, but Lace has no framework-independent domain vocabulary or
rules with which application use cases and future persistence adapters can act
on it. Step 4A establishes those shared rules before ports, in-memory fakes,
or use cases introduce stateful behavior.

## What Changes

- Add a portable `@lacecms/domain` vocabulary for branded identifiers and
  keys, content-model kinds, draft and published entry aggregates, ordered
  blocks, media metadata, build state, actors, roles, permissions, and stable
  domain error codes.
- Define and enforce the default viewer/editor/admin role-to-permission matrix
  through `requirePermission`.
- Add pure rules for page singleton cardinality, collection slugs and route
  resolution, sparse block positions and normalization, and global public-path
  conflict detection.
- Encode the content lifecycle invariants: every committed entry has one draft,
  at most one published snapshot, published data is immutable, and a complete
  draft mutation advances its revision exactly once.

## Capabilities

### New Capabilities

- `content-domain-rules`: Portable CMS domain vocabulary, authorization,
  routing, block-ordering, and content-lifecycle rules.

### Modified Capabilities

- None.

## Impact

- Implements roadmap Step 4, Session 4A and architecture sections 4.4, 4.7,
  6, 8, 9.2–9.8, and 10.
- Affects only `packages/domain` and its tests. The package may use portable
  types from `@lacecms/content` but must not import transport, database,
  runtime, or framework packages.
- Preserves the accepted `content-model-configuration`, `block-registry`, and
  `content-validation` specs as inputs. It deliberately excludes application
  ports/fakes (4B), use cases (4C), SQL persistence (Step 5), REST contracts,
  authentication integration, and build dispatch.
