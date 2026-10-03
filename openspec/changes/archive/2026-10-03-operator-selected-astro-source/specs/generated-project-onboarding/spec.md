## MODIFIED Requirements

### Requirement: Root quickstart describes the delivered consumer workflow

The generated root README SHALL describe compatible Node/pnpm, Docker Compose and matching release prerequisites; dependency installation; protected environment preparation before environment-loaded scripts; settings/origins; setup-stage doctor; explicit migration and configuration sync; API start; bootstrap and first-admin creation; login and Settings-issued build token; Home publication; Astro development/static build; Compose operation and stop commands that preserve data. It SHALL explain root `lace.config.ts`, Home/Posts models, user-owned routes, SDK export loading, renderers, layouts and styling, linking to `docs/lace-operations.md` for detailed operation and private setup input. It SHALL distinguish draft save, publication and static deployment, identify the explicit generated `site/` default and link to deployment-time external Astro source selection, and explain that `--cloudflare` supplies Pages configuration rather than complete CMS Worker onboarding. It SHALL state that source-template behavior requires matching freshly built packages/images or a later compatible release and is not retroactively added to published alpha artifacts.

#### Scenario: Consumer starts from README
- **WHEN** a fresh consumer follows README with compatible artifacts
- **THEN** preparation precedes migration/sync, the consumer can complete first-admin setup and Home publication, and the site can read published content with a server-only build token using documented commands

#### Scenario: User extends the site
- **WHEN** the consumer adds a model or custom block
- **THEN** README explains explicit sync and user-owned route/renderer work, identifies the layout and SDK loader, and refers to the operations guide for guarded structural changes

#### Scenario: Later roadmap capabilities are absent
- **WHEN** a consumer reads the Cloudflare, setup or builder sections
- **THEN** the guide describes the existing API setup and generated-site/Pages support with browser setup for compatible Step 28A or later API/admin artifacts and the retained API alternative, with external-site selection requiring compatible Step 29A or later artifacts, without promising a generated CMS Worker deployment

## ADDED Requirements

### Requirement: External site operation documents mount and integration prerequisites
The operations guide SHALL document generated and external-site selection for Node/VPS, including a standalone Astro root containing `cms/`, a workspace root containing the selected site and CMS packages, root lockfile ownership, read-only bind accessibility, container-relative selection and fixed release storage. It SHALL identify the currently configured safe site identity, teach operators to configure the same identity for API and builder and restart affected services, and explain that identity is configuration rather than deployment verification. External sites SHALL require an existing compatible Astro dependency, pnpm lockfile and user-owned published-export SDK loader/routes/renderers with server-only credentials and expected published-version handling. Documentation SHALL preserve separate internal export and browser-facing media origins, give sanitized failure/retry guidance, and explain that failed builds preserve the last served release. It SHALL NOT promise automatic existing-site modification, renderer installation, generator initialization in a populated directory or dev refresh behavior not verified in 29B.

#### Scenario: Existing standalone Astro site
- **WHEN** an operator follows the parent-root example from a generated `cms/` directory
- **THEN** the guide identifies the host mount separately from `/source`, selects the root Astro project and lockfile, identifies the served release volume and describes required user-owned CMS integration

#### Scenario: External workspace package
- **WHEN** an operator follows the workspace example
- **THEN** the guide selects the workspace lockfile and the intended package without requiring a package name matching the Lace example

#### Scenario: Mount or build fails
- **WHEN** the selected source is missing or a frozen install or Astro build fails
- **THEN** the guide describes checking deployment mounts and dependencies, correcting source and retrying without claiming deployment success or replacing the previous release
