## ADDED Requirements

### Requirement: Contributor workflow proves code-owned content end to end
The local developer workflow SHALL demonstrate adding a page and collection in code, explicitly synchronizing their models, editing drafts in Admin, publishing entries, reading published-only API output, and refreshing the Astro site to observe the corresponding URLs. It SHALL state the field and block registration steps and distinguish structural model changes that require a version increase from display-only metadata changes that do not.

#### Scenario: Contributor adds and publishes a page and collection entry
- **WHEN** a contributor follows the local workflow from a migrated stack with the matching Astro route files present
- **THEN** Admin exposes the synchronized page and collection, and publication followed by the documented site refresh displays their published content at the configured URLs

#### Scenario: Contributor saves a later draft
- **WHEN** a contributor saves changed content or a slug without publishing and performs the documented site refresh
- **THEN** published-only API output and the site continue showing the previous published content and route

#### Scenario: Contributor changes model structure
- **WHEN** a contributor changes fields, allowed blocks, a page path, or a collection route
- **THEN** the guide instructs them to increase that model's version before explicit synchronization and explains that stored content can still make the plan invalid
