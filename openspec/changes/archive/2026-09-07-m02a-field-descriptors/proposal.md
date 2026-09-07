## Why

Lace needs one portable, code-first description of every MVP field before
models, blocks, API contracts, and the admin can share data shape safely. The
current `@lacecms/content` package is a Step 1 skeleton, so Session 2A
establishes the serializable field-descriptor foundation without taking on
content-submission validation planned for Session 2B.

## What Changes

- Add the Step 2A field-definition API in `@lacecms/content`: a discriminated
  union and `field.*` builders for text, textarea, rich text, number, boolean,
  date, datetime, select, URL, and media.
- Normalize builder options into immutable JSON-serializable definitions;
  reject executable, symbolic, cyclic, duplicate-select, invalid-default, and
  contradictory-constraint input while configuration is being built.
- Expose serializable form metadata derived from field definitions, with no
  runtime schema objects or executable callbacks in the projected value.
- Add compile-time inference coverage and runtime table tests for all field
  variants, options, normalization failures, and JSON metadata round trips.

## Capabilities

### New Capabilities

- `field-descriptors`: Portable field definitions, builders, normalization, and
  serializable form metadata for Lace's initial field-type set.

### Modified Capabilities

- None.

## Impact

- Implements roadmap Step 2, Session 2A only, and follows architecture sections
  6, 8, and 11; it introduces no database, routing, REST, config-model, or
  runtime-adapter behavior.
- Adds the first product behavior to `packages/content` without exposing a
  runtime schema library; Valibot compilation remains Session 2B work.
- The accepted `workspace-governance` specification remains unchanged; this
  change must preserve its portable-package and public-entry-point constraints.
- Session 2B will compile these descriptors to Valibot schemas and add draft,
  publish, rich-text, and canonical-data validation. It is intentionally out of
  scope for this independently testable change.
