## ADDED Requirements

### Requirement: Reference site serves additional code-owned published routes
The reference site SHALL provide an `about` page at `/about` and one `/notes/:slug` route per published `notes` entry. These routes SHALL use the existing ordered block renderer and SHALL derive content from the same validated build export used by the home and blog routes. A route SHALL NOT be emitted solely because its model or draft exists. The CMS SHALL NOT create or select Astro route files.

#### Scenario: Additional page and collection are published
- **WHEN** the build export contains a published `about` entry at `/about` and published `notes` entries with canonical paths
- **THEN** the static site emits `/about` and each corresponding `/notes/:slug` page with its published title and blocks

#### Scenario: Model or entry exists only as a draft
- **WHEN** the `about` page or a `notes` entry has no published snapshot
- **THEN** the corresponding route is absent from the generated site

#### Scenario: A later draft differs from publication
- **WHEN** a previously published entry has a subsequently saved draft with different content or slug
- **THEN** the generated route and HTML retain the current published path and content until the entry is published again

#### Scenario: Additional route has an unsupported block
- **WHEN** a published `about` or `notes` entry contains a block without a site renderer
- **THEN** the build fails with its model key, entry identifier, and block key
