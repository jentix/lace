## MODIFIED Requirements

### Requirement: Shared entry payload limits
The content package SHALL export shared constants and validators that enforce a
title of at most 200 characters, a slug of at most 100 characters, no more than
200 top-level blocks, and no more than 1,000,000 UTF-8 bytes in model fields or
in one block's JSON data. Complete aggregate validation SHALL require each
block to identify its stable key, type, schema version, and JSON data, and SHALL
delegate type/version, uniqueness, allowed-block, and block-field semantics to
the supplied block registry and model. Draft validation SHALL require a title;
publish validation SHALL additionally require a slug for a collection entry and
all required model and block fields. Size, count, and semantic failures SHALL
identify the affected system field, fields payload, or block path.

#### Scenario: Validate a bounded draft payload
- **WHEN** a draft supplies a title within the limit, valid model field data,
  and at most 200 registered, allowed blocks whose individual data values are
  within the JSON-byte limit
- **THEN** aggregate validation succeeds without requiring a collection slug or
  otherwise-required draft field values

#### Scenario: Reject an oversized or overlong payload
- **WHEN** a title, slug, fields JSON value, block JSON value, or top-level
  block list exceeds its shared limit
- **THEN** validation fails with a stable path-aware issue for that value

#### Scenario: Require a collection slug at publication
- **WHEN** a collection entry with a valid title is validated for publish
  without a slug
- **THEN** validation rejects the missing slug at the slug path
