## Context

`@lacecms/content` now supplies portable, deeply frozen field definitions,
canonical JSON, and an asynchronous Web Crypto-compatible SHA-256 helper. The
`@lacecms/config` package currently contains only the Step 1 scaffold. This
change implements roadmap Step 3, Session 3A; block definition, block-registry
validation, and runtime/admin projections are deliberately reserved for 3B.

## Goals / Non-Goals

**Goals:**

- Provide a portable typed model DSL that uses only the public content-package
  API and contains no Node-only dependencies.
- Make route forms and configuration-only collisions fail synchronously during
  normalization, and make resolved public paths canonical.
- Produce hashes suitable for the later configuration-sync comparison described
  in architecture section 8.

**Non-Goals:**

- Defining or validating block implementations and block payloads.
- Loading `lace.config.ts`, synchronizing configuration to a database, or
  enforcing historical version/hash comparisons; those require later runtime and
  persistence work.
- Detecting collection-to-collection runtime collisions, which remain guarded by
  `published_routes` when actual slugs are published.

## Decisions

### Separate declarative model definitions from normalized hashed results

`definePage` and `defineCollection` will synchronously validate and detach
portable inputs, preserving generic field-map types. `defineConfig` will
assemble the definitions, perform cross-model checks, and asynchronously return
the normalized configuration once its Web Crypto hashes are available. This
uses top-level `await` in a project's ESM `lace.config.ts` when hashes are
needed, keeping hash generation identical in Node and Workers. A synchronous
Node crypto implementation is rejected because it would violate portability;
returning unfinished hash promises in a model is rejected because consumers
could observe incomplete configuration.

### Canonical routes are validated as path segments, not rewritten

Route validation will split the input into segments after first rejecting all
ambiguous syntax. It will accept the root page path or non-empty literal
segments; collection patterns require one complete `:slug` segment and reject
any other parameter. It will never collapse duplicate slashes or resolve dot
segments: accepting aliases would undermine public-route uniqueness. A matcher
will compare fixed page segments with collection literals and the single slug
placeholder to catch collisions visible before persistence.

### Hash projections use explicit recursive omission of display keys

Normalized field definitions are serializable data from `@lacecms/content`.
Structural hashing will construct a detached semantic projection that removes
only display keys (`label` and `description`) at model and field levels, while
retaining identity, version, kind, fields, allowed blocks, and route form.
Projection hashing uses the complete normalized object, including temporary
`renamedFrom` metadata. Both projections are canonically serialized and hashed
through the existing portable helper, so insertion order cannot affect them.

### Keep block keys declarative in 3A

Models will accept a detached list of block-type keys but will not require a
registry yet. Session 3B will add the registry and validate that this list names
registered block types. Rejecting unknown blocks now would force built-ins or
registry behavior into the wrong roadmap unit.

## Risks / Trade-offs

- [Async normalized config changes the example's synchronous-looking call
  shape] → Document the top-level-await requirement in package exports and cover
  it with a configuration fixture; it preserves one portable hashing path.
- [Configuration cannot detect two collections producing the same future URL]
  → Validate collection patterns now and rely on the authoritative
  `published_routes.path` uniqueness constraint at publication.
- [Temporary rename metadata could linger] → Preserve it transparently for the
  later sync planner, which will report it until operators remove it after all
  environments converge.

## Migration Plan

This package has no prior public model DSL. Consumers add the new configuration
API and await normalized configs during startup. Reverting the change removes
the package API and its independent spec archive; it has no database or route
migration.
