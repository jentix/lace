## ADDED Requirements

### Requirement: Generated deployment declares an explicit build site
Generated Compose and `.env.example` SHALL explicitly select the generated installation root, `site` project, root frozen lockfile, `dist` static output and safe default site identity. The bind mount SHALL remain read-only and SHALL reject missing source rather than create directories. API and builder SHALL receive identity from the same deployment inputs. Operators SHALL be able to select an existing standalone Astro root or a workspace Astro package alongside a separately generated CMS directory by changing deployment configuration, without regenerating or overwriting user source. The generator's empty-target rule SHALL remain unchanged.

#### Scenario: Default generated deployment
- **WHEN** an operator starts a compatible generated Compose stack without source overrides
- **THEN** it selects the generated `site` with the declared default identity and fixed release storage

#### Scenario: CMS is beside existing Astro source
- **WHEN** an operator configures the documented parent-root mount and explicit project selection from `cms/`
- **THEN** builder source resolves inside `/source` and API/admin receive the same safe identity without mounting host credentials

### Requirement: Build-site template upgrades protect ownership
The generator SHALL advance the managed template version to `0.7.0`, retain deterministic managed hashes, provide template upgrade instructions for source selection and identity, and preserve user-owned README, site source and `lace.config.ts`. Modified managed files SHALL retain existing conflict detection. Instructions SHALL require compatible new API/admin/builder/CLI artifacts and SHALL NOT claim this feature exists in previously published alpha images or publish replacement artifacts automatically.

#### Scenario: Operator has edited generated source and infrastructure
- **WHEN** a consumer reviews an upgrade to the explicit-selection template
- **THEN** source and README stay unchanged, modified managed infrastructure requires conflict review, and migration guidance explains artifact compatibility and selected mounts
