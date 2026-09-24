## ADDED Requirements

### Requirement: Content landing explains empty and unsynchronized models
The content landing route SHALL show a distinct empty state when the authenticated model list succeeds with no configured models, with guidance to define a model in code and run local synchronization. When a configured page has no singleton entry, it SHALL explain the likely pending synchronization and give the local command. API failures SHALL remain visible as errors rather than appearing as an empty configuration. Where the API does not expose persisted identity for a collection, the UI SHALL not claim synchronization is complete from an empty entry list alone.

#### Scenario: No configured models
- **WHEN** the content-model API succeeds with an empty list
- **THEN** the landing route shows a no-models explanation and local setup guidance

#### Scenario: Page has no synchronized singleton
- **WHEN** the model API contains a page but its entry list is empty
- **THEN** the landing route explains that local synchronization may be pending and shows `pnpm content:sync`

#### Scenario: Model API fails
- **WHEN** loading models fails
- **THEN** the landing route shows the API error and does not present the no-models state
