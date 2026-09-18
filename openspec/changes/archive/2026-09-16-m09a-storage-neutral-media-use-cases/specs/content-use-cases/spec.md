## MODIFIED Requirements

### Requirement: Complete aggregate validation precedes each lifecycle write
The system SHALL resolve the entry's normalized model and runtime block registry
before a create, complete-draft save, or publish command. Create and save SHALL
validate the complete draft aggregate in draft mode; publish SHALL revalidate the
current complete draft in publish mode before it resolves a route or invokes its
guarded publication command. Validation SHALL apply the model and block
semantics, allowed block types and current versions, field defaults, title/slug,
unique ordered block keys and positions, shared block/count/UTF-8-byte limits,
and all referenced media identifiers. A media reference is valid only when its
metadata exists and is active. For every accepted complete draft, the use case
SHALL rebuild the entire relational media-reference projection from the
normalized model fields and normalized block fields, with `$fields` or the
stable block key and a field path for each reference; it SHALL not retain stale
references or ask an adapter to discover references by parsing arbitrary JSON.
Any validation failure SHALL leave the stored entry, public route, and public
projection unchanged.

#### Scenario: Draft save rejects an invalid complete aggregate atomically
- **WHEN** a writer saves a draft with an unknown field, disallowed block,
  duplicate or unordered block key/position, missing or inactive media item, or
  an exceeded shared payload limit
- **THEN** the save fails before the atomic save command and the previously
  stored draft revision and content remain unchanged

#### Scenario: Publish applies stricter required-field validation
- **WHEN** a valid incomplete draft omits a publish-required model or block
  field, or a collection slug
- **THEN** draft save remains permitted but publication fails before route
  resolution and public content remains unchanged

#### Scenario: Valid draft values are normalized before persistence
- **WHEN** a writer saves a complete valid draft whose model or block fields
  omit descriptor defaults
- **THEN** the atomic save receives the normalized aggregate with those defaults
  applied and advances the draft revision exactly once

#### Scenario: Replacing a draft rebuilds media references
- **WHEN** a writer saves a valid complete draft that adds, removes, or replaces
  media fields in its model fields or blocks
- **THEN** the atomic save receives exactly the media-reference projection for
  the normalized submitted aggregate, without stale references from the prior
  draft
