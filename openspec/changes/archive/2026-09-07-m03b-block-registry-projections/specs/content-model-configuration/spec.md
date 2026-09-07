## MODIFIED Requirements

### Requirement: Typed, stable content-model definitions
The system SHALL let configuration code define page and collection models with
stable lowercase kebab-case keys, a positive integer version, optional display
label and description, typed field descriptors, allowed block-type keys, and
an optional explicit `renamedFrom` key. A page SHALL contain one fixed path; a
collection SHALL contain one route pattern. The configuration result SHALL
preserve field value inference, reject malformed definitions, reject duplicate
model keys and duplicate `renamedFrom` sources, and reject every allowed block
type not present in the supplied block registry. `renamedFrom` SHALL be treated
as temporary metadata for an explicit later synchronization and SHALL NOT infer
a rename when it is absent.

#### Scenario: Define typed page and collection models
- **WHEN** configuration code defines a valid page and collection with field
  descriptors and allowed blocks that are registered
- **THEN** their inferred field value shapes, kind, version, route form, and
  allowed block types are retained in the normalized configuration

#### Scenario: Reject an unstable model identity
- **WHEN** a model has an empty or non-kebab-case key, a non-positive or
  non-integer version, an invalid `renamedFrom` key, a repeated current or former
  key, or an allowed block type absent from the registry
- **THEN** configuration normalization fails before application startup

### Requirement: Deterministic normalized configuration identity
The system SHALL return model and whole-configuration definitions as detached,
deeply readonly plain data. It SHALL provide a runtime projection containing
compiled field and block validators and a JSON admin/public projection that
contains only serializable configuration and block metadata. The public
projection SHALL provide deterministic structural and projection hashes for
every model and for the complete configuration using canonical JSON and the
portable SHA-256 contract. Structural hashes SHALL exclude model, field, and
block display metadata; projection hashes SHALL include the complete serializable
normalized definition. Equal semantic configurations SHALL produce equal hashes
regardless of object insertion order.

#### Scenario: Ignore display-only changes in structural identity
- **WHEN** two otherwise identical model definitions differ only in model,
  field, or block label and description
- **THEN** their structural hashes match and their projection hashes differ

#### Scenario: Detect a structural model change
- **WHEN** otherwise identical definitions differ in kind, version, fields,
  allowed blocks, block schema version or fields, fixed path, or collection route
- **THEN** their structural hashes differ

#### Scenario: Project configuration for public metadata consumption
- **WHEN** a valid configuration including registered blocks is normalized
- **THEN** the runtime projection exposes compiled validators while its JSON
  admin/public projection round-trips through JSON without functions

#### Scenario: Detach normalized configuration from caller inputs
- **WHEN** caller-owned model, field-map, block-definition, or block-key
  containers are modified after configuration normalization
- **THEN** the normalized definitions, projections, and hashes remain unchanged
  and cannot be mutated through their returned values
