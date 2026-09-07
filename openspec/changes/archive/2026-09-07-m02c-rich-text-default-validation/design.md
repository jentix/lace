## Context

See [proposal.md](./proposal.md) for the motivation. Session 2B established the
closed safe rich-text contract in the content-validation capability. The
Session 2A field-descriptor specification still describes a rich-text default
as an arbitrary JSON object, despite the field normalizer already applying the
closed contract.

## Goals / Non-Goals

**Goals:**

- Make the accepted field-descriptor contract match the existing portable
  implementation and its safe rich-text boundary.
- Keep descriptor normalization and submitted-content validation clearly
  separated for all non-rich-text field kinds.
- Add focused regression coverage for an unsafe rich-text default.

**Non-Goals:**

- Changing the closed node, mark, attribute, or URL allowlist established in
  Session 2B.
- Adding semantic default validation for date, datetime, URL, or media fields.
- Changing serialized metadata, persisted data, public exports, or dependencies.

## Decisions

### Make rich-text defaults use the existing closed document contract

The modified requirement will state that a rich-text default must satisfy the
same safe shared Tiptap JSON contract used for submitted rich-text values. The
field-descriptor test suite will demonstrate rejection of unsafe document input
and preservation of a detached accepted document.

Alternative considered: retain arbitrary JSON defaults and defer checking until
record validation. Rejected because a normalized descriptor itself is reusable
configuration; allowing unsafe content there creates a conflicting contract and
lets unsafe data enter a default before it is applied to a record.

### Keep the correction deliberately narrow

Date, datetime, URL, and media descriptor defaults remain string-only at
normalization time. Their existing submitted-value semantics are owned by the
content-validation capability, and are not asserted as field configuration
behavior by this change.

Alternative considered: align every default with runtime submitted-value
semantics. Rejected because it expands the reviewed correction beyond the
specific rich-text inconsistency and would require separate decisions on
configuration compatibility.

## Risks / Trade-offs

- [Existing integrations may have used arbitrary JSON rich-text defaults.] →
  Reject them consistently at normalization rather than allowing data that no
  safe renderer can rely on.
- [The two validation layers may be conflated later.] → The specification
  explicitly names descriptor normalization versus submitted-content validation.

## Migration Plan

1. Confirm the committed field normalizer and focused tests enforce the revised
   requirement.
2. Add the unsafe-default regression case if absent, then run the content
   package and repository quality gates.
3. Synchronize the verified delta into the accepted field-descriptor
   specification during archive. No data migration or deployment action is
   required; rollback is a source revert before release.
