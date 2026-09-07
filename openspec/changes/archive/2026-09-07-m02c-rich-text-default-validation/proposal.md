## Why

Session 2A accepted rich-text defaults as any JSON object, while Session 2B
introduced a shared safe Tiptap document contract and the field builder now
enforces that contract for rich-text defaults. The conflict prevents the
completed Session 2A and 2B changes from being archived as a coherent source
of truth.

## What Changes

- Implement the corrective follow-up to roadmap Step 2, Sessions 2A–2B by
  updating the accepted field-descriptor default-value contract.
- Require a rich-text default to be a safe shared Tiptap document accepted by
  the Session 2B rich-text allowlist, and add a rejection scenario for unsafe
  documents.
- Preserve the existing, intentionally narrower normalization rules for date,
  datetime, URL, and media defaults; their semantic validation remains part of
  submitted-content validation.
- Reconcile only the specification contract and its verification coverage. No
  new production capability or broad rich-text behavior is introduced.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `field-descriptors`: Align rich-text default validation with the accepted
  safe rich-text document contract.

## Impact

- Affected accepted specification: `openspec/specs/field-descriptors/spec.md`.
- Existing implementation: `@lacecms/content` field normalization and its
  tests, committed in `af74d86` as part of Session 2B.
- This follows the code-first structure and portable JSON invariants in
  architecture sections 3.3, 4.5, and 4.8, without changing dependencies or
  public API shape.
