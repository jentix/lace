## Context

See [proposal.md](./proposal.md) for motivation and
[field-descriptor requirements](./specs/field-descriptors/spec.md) for the
behavior contract. `@lacecms/content` is currently an empty portable library;
architecture sections 6, 8, and 11 require it to remain independent of Node,
frameworks, and raw runtime-validation schemas while serving config, domain,
contracts, admin, and site consumers.

## Goals / Non-Goals

**Goals:**

- Create one immutable, JSON-safe descriptor representation from which future
  runtime validation, form rendering, and model inference can be derived.
- Make malformed field configuration fail immediately at builder invocation,
  before configuration synchronization or request handling.
- Keep static TypeScript inference aligned with the field kind and literal
  select choices.

**Non-Goals:**

- Compiling descriptors to Valibot, validating submitted content, or defining
  draft/publish modes.
- Semantic validation of Tiptap documents and URL protocols, canonical JSON,
  content-model definitions, routes, blocks, persistence, or REST DTOs.
- Reference fields, custom executable validation, or an admin form renderer.

## Decisions

### Store normalized descriptors as plain discriminated data

Each builder will produce a detached plain object with a `type` discriminant,
common options, and only the options that apply to that field kind. A shared
metadata projection will be derived from that representation instead of storing
parallel hand-maintained admin data. The builder will copy and deeply freeze its
normalized output so subsequent caller mutation cannot change the configuration
that downstream consumers inspect.

Alternative considered: store raw options and generate metadata later from
caller-owned objects. Rejected because later mutations, executable values, and
cyclic graphs could make the startup configuration non-deterministic or
unserializable.

### Enforce portable JSON at the boundary

Use one recursive normalizer for every builder input and default value. It will
allow null, booleans, strings, finite numbers, dense arrays, and plain-object
records with string keys; it will recursively copy them and reject all other
runtime values, including functions, symbols, bigint, `undefined`, non-finite
numbers, cycles, and class or host objects. This is stricter than incidental
`JSON.stringify` behavior, which can silently discard data or invoke custom
serialization.

Alternative considered: call `JSON.stringify` and parse it. Rejected because
it drops undefined/function/symbol object properties, converts non-finite
numbers, accepts custom `toJSON`, and gives weak diagnostics.

### Validate structural field contracts before Valibot compilation

Session 2A will use a small field-kind switch for default and constraint checks.
It will check primitive kind, finite numeric values, declared bounds, select
membership, and JSON-object rich-text defaults. Date, datetime, media, and URL
defaults are strings at this boundary; their format and semantic rules join the
shared submitted-content schema in Session 2B. This keeps a default valid under
the same currently-defined field contract without prematurely exposing a
partial Valibot public API.

Alternative considered: introduce partial Valibot schemas now. Rejected because
the roadmap assigns field-schema compilation and the exhaustive validation
visitor to Session 2B, and a partial schema contract would blur that boundary.

### Preserve inference with generic builders

Builder overloads or const-generic option types will carry the field-value type
through each definition. The select builder will derive a union from a readonly
non-empty tuple of choice strings. Exported utility types will let later model
and block APIs infer values from a `FieldDefinition` without importing internal
implementation details.

Alternative considered: type every builder as the broad union. Rejected because
model and block authors would lose compile-time validation of select values and
field-specific defaults.

### Test the public contract at runtime and compile time

Runtime tests will execute from the built package, table-drive every field
variant and invalid configuration class, and verify JSON metadata round trips.
Type-only tests will compile with the package build/typecheck path and use
positive/negative assertions for inferred values, literal selects, and default
types. Tests remain in `packages/content` so the portable package needs no
cross-package fixture or adapter.

Alternative considered: rely on runtime tests for type behavior. Rejected
because TypeScript inference is an explicit Session 2A outcome.

## Risks / Trade-offs

- [The initial definition shape may constrain later reference fields.] → Keep
  the discriminant and inference utility exhaustive, but reserve reference
  fields for a later additive variant.
- [Strict JSON copying rejects values a JavaScript caller expects to pass.] →
  This is intentional portability enforcement; errors identify the option path
  before configuration becomes authoritative.
- [Date, datetime, URL, and rich-text semantics are incomplete in this session.]
  → The contract explicitly limits 2A to structural default compatibility and
  assigns semantics to Session 2B.

## Migration Plan

1. Replace the Step 1 content-package identity export with the descriptor public
   API while preserving the explicit package entry point.
2. Add focused runtime and type-level tests, then run the package and required
   root quality gates.
3. Roll back by reverting this code-only change; it creates no stored data,
   runtime configuration migration, or deployment state.
