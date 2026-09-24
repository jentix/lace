## ADDED Requirements

### Requirement: Contributors can edit code-owned models with route guidance
The local developer guide SHALL identify the root configuration as the editable source of page and collection definitions, explain the stable key, version and explicit rename rules, and show how fixed page paths and collection route patterns relate to contributor-owned Astro route and rendering code. It SHALL instruct contributors to restart the development API after a configuration edit and SHALL make clear that configuration loading does not synchronize SQLite models or create content automatically.

#### Scenario: Add a page or collection in a local checkout
- **WHEN** a contributor follows the guide to define a model and its corresponding Astro route
- **THEN** they can identify the required configuration fields, route ownership, restart step, and separate synchronization step

#### Scenario: Configuration changes without synchronization
- **WHEN** a contributor restarts the local API after editing configuration but has not synchronized the database
- **THEN** the guide does not promise that the changed model is immediately editable in the admin
