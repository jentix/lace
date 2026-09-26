## ADDED Requirements

### Requirement: Collection list fields
The system SHALL let a collection definition declare an optional ordered
`listFields` array naming the model's own fields that entry lists display.
Each name SHALL identify a field declared by the same collection whose type is
text, textarea, number, boolean, select, date, datetime, or URL. Configuration
SHALL reject a non-array value, a non-string or unknown name, a duplicate name,
and a rich-text or media field before application startup. An omitted or empty
`listFields` SHALL normalize to no list fields and SHALL leave the normalized
model without a `listFields` property. The normalized collection and its JSON
admin/public projection SHALL retain the declared order. Page definitions SHALL
not carry list fields. Typed configuration code SHALL restrict `listFields`
names to the collection's declared field keys.

#### Scenario: Declare list fields on a collection
- **WHEN** a collection with `author` text and `category` select fields
  declares `listFields: ["category", "author"]`
- **THEN** the normalized collection and its JSON projection contain
  `listFields` `["category", "author"]` in that order

#### Scenario: Reject an invalid list field
- **WHEN** a collection's `listFields` names an undeclared field, repeats a
  name, or names a rich-text or media field
- **THEN** configuration normalization fails with a configuration error before
  application startup

#### Scenario: Omit empty list fields
- **WHEN** a collection omits `listFields` or declares an empty array
- **THEN** its normalized model has no `listFields` property and its hashes
  equal those of the same model without the option

## MODIFIED Requirements

### Requirement: Deterministic normalized configuration identity
The system SHALL return model and whole-configuration definitions as detached,
deeply readonly plain data. It SHALL provide a runtime projection containing
compiled field and block validators and a JSON admin/public projection that
contains only serializable configuration and block metadata. The public
projection SHALL provide deterministic structural and projection hashes for
every model and for the complete configuration using canonical JSON and the
portable SHA-256 contract. Structural hashes SHALL exclude model, field, and
block display metadata, a collection's `listFields` presentation metadata, and
the temporary `renamedFrom` synchronization hint; projection hashes SHALL
include the complete serializable normalized definition, including
`listFields`, except `renamedFrom`. Equal semantic configurations SHALL produce
equal hashes regardless of object insertion order.

#### Scenario: Ignore display-only changes in structural identity
- **WHEN** two otherwise identical model definitions differ only in model,
  field, or block label and description
- **THEN** their structural hashes match and their projection hashes differ

#### Scenario: Ignore list presentation in structural identity
- **WHEN** two otherwise identical collection definitions differ only in their
  `listFields`
- **THEN** their model and complete-configuration structural hashes match and
  their projection hashes differ, so synchronization treats the change as a
  projection-only update that needs no version increase

#### Scenario: Ignore temporary rename metadata in configuration identity
- **WHEN** two otherwise identical model definitions differ only by a valid
  `renamedFrom` hint
- **THEN** their model and complete-configuration structural and projection
  hashes match while the runtime model retains the hint for synchronization

#### Scenario: Detect a structural model change
- **WHEN** otherwise identical definitions differ in kind, version, fields,
  allowed blocks, block schema version or fields, fixed path, or collection route
- **THEN** their structural hashes differ

#### Scenario: Project configuration for public metadata consumption
- **WHEN** a valid configuration including registered blocks is normalized
- **THEN** the runtime projection exposes compiled validators while its JSON
  admin/public projection round-trips through JSON without functions

#### Scenario: Detach normalized configuration from caller inputs
- **WHEN** caller-owned model, field-map, block-definition, block-key, or
  list-field containers are modified after configuration normalization
- **THEN** the normalized definitions, projections, and hashes remain unchanged
  and cannot be mutated through their returned values
