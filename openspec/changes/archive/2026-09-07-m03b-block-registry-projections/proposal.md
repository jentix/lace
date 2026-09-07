## Why

Session 3A records allowed block keys declaratively, but cannot establish that
those keys are implemented or validate an entry's ordered block payloads. Lace
needs one portable block registry to make the configuration executable at
startup and safely project it to both the runtime and admin clients.

## What Changes

- Implement the Step 3, Session 3B block DSL in `@lacecms/content`, including
  versioned block definitions, portable defaults, compiled field validators,
  serializable metadata, and duplicate type/version protection.
- Define the `hero`, `richText`, `image`, `quote`, and `cta` starter blocks
  solely through that public DSL.
- Extend configuration normalization to accept a block registry, reject model
  block keys absent from that registry, and expose executable runtime and
  function-free admin/public projections.
- Validate complete ordered draft and publish aggregates with model fields,
  system fields, allowed blocks, block versions, stable per-entry block keys,
  block payloads, and existing shared size limits.
- Add the architecture's root configuration fixture and snapshot its canonical
  serialized public projection.

## Capabilities

### New Capabilities

- `block-registry`: Versioned portable block definitions, built-in blocks,
  registry identity rules, block payload validation, and serializable block
  metadata.

### Modified Capabilities

- `content-model-configuration`: Configuration accepts and verifies a block
  registry and provides separate executable runtime and serializable public
  projections.
- `content-validation`: Complete entry aggregate validation gains typed ordered
  block validation while retaining existing system-field and payload limits.

## Impact

- Affects the public `@lacecms/content` and `@lacecms/config` APIs, their unit
  and type tests, and the root configuration fixture; no database, REST,
  configuration-sync, or admin UI behavior is introduced.
- Implements roadmap Step 3, Session 3B and architecture sections 8, 9.6, and
  11. It depends on the accepted `field-descriptors`, `content-validation`, and
  `content-model-configuration` specifications and keeps the Node/Worker
  portability invariant.
