## MODIFIED Requirements

### Requirement: Generated starter renders published exports with owned safe renderers
The generated home and posts models SHALL permit all five built-in blocks. The site SHALL derive home and canonical blog routes from one validated authenticated published export per static build, preserving block order, safe structural rich-text rendering and stable entry, block and part styling hooks. In Astro development the site SHALL revalidate that export with its entity tag on each render so published changes to existing routes appear on reload, and post pages SHALL read the current published entry for their slug rather than route data cached at startup. Renderers and their helpers SHALL be user-owned. Unknown blocks SHALL fail with model, entry and block identifiers. Missing home, unavailable API and rejected/missing build credentials SHALL produce actionable diagnostics without revealing credentials; failed export reads SHALL be retryable. Drafts SHALL NOT affect static or dev output until publication. Build credentials SHALL NOT appear in static output or browser configuration.

#### Scenario: Complete published starter build
- **WHEN** the export contains published home and posts with hero, richText, image, quote and cta blocks
- **THEN** the generated site performs one export request and emits those blocks in order with stable styling hooks and public media links

#### Scenario: Unsupported or unsafe content
- **WHEN** a block lacks a renderer or rich text contains unsafe links or unsupported attributes
- **THEN** the build rejects the content with actionable context instead of emitting unsafe or partial markup

#### Scenario: Later draft exists
- **WHEN** a draft is edited after publication
- **THEN** the built title, route and blocks still come exclusively from the published export

#### Scenario: Development revalidation
- **WHEN** generated Astro dev renders again after an unchanged or changed publication
- **THEN** it sends a conditional export request, reuses the validated export on not-modified, and renders the newly published content after a change

### Requirement: External site operation documents mount and integration prerequisites
The operations guide SHALL document generated and external-site selection for Node/VPS, including a standalone Astro root containing `cms/`, a workspace root containing the selected site and CMS packages, root lockfile ownership, read-only bind accessibility, container-relative selection and fixed release storage. It SHALL identify the currently configured safe site identity, teach operators to configure the same identity for API and builder and restart affected services, and explain that identity is configuration rather than deployment verification. External sites SHALL require an existing compatible Astro dependency, pnpm lockfile and user-owned published-export SDK loader/routes/renderers with server-only credentials and expected published-version handling. Documentation SHALL preserve separate internal export and browser-facing media origins, give sanitized failure/retry guidance, and explain that failed builds preserve the last served release. For an existing site's own dev integration it SHALL explain the verified behavior: data read in page code on each render appears on reload, data passed through cached `getStaticPaths` props and new routes appear after restarting Astro dev. It SHALL NOT promise automatic existing-site modification, renderer installation or generator initialization in a populated directory.

#### Scenario: Existing standalone Astro site
- **WHEN** an operator follows the parent-root example from a generated `cms/` directory
- **THEN** the guide identifies the host mount separately from `/source`, selects the root Astro project and lockfile, identifies the served release volume and describes required user-owned CMS integration

#### Scenario: External workspace package
- **WHEN** an operator follows the workspace example
- **THEN** the guide selects the workspace lockfile and the intended package without requiring a package name matching the Lace example

#### Scenario: Mount or build fails
- **WHEN** the selected source is missing or a frozen install or Astro build fails
- **THEN** the guide describes checking deployment mounts and dependencies, correcting source and retrying without claiming deployment success or replacing the previous release

#### Scenario: Existing site in Astro dev
- **WHEN** an operator integrates an existing site and runs its Astro dev server
- **THEN** the guide explains which reads appear on reload and which require a dev restart, without prescribing a restart after every publication

## ADDED Requirements

### Requirement: Generated guides explain publication visibility per mode
The generated README and operations guide SHALL separately explain draft save, CMS publication, Astro dev visibility, manual static build and deployment, and automatic Compose build/release visibility. They SHALL state that dev shows publications to existing routes on reload and needs a restart for new or renamed slugs, token or environment changes; that a manual static build requires a fresh build and the operator's own deployment; and that Compose serves content after a succeeded covering build, keeps the previous release on failure, may serve a release moments before Builds records success, and sends revalidating cache headers. They SHALL direct operators to Builds for pending/running/succeeded/failed state and SHALL NOT claim dev, manual or provider deployment success from CMS publication state.

#### Scenario: Operator publishes in each mode
- **WHEN** an operator follows the guide after publishing a change
- **THEN** the documented next action for dev, manual static and Compose produces the observed visible result without an unnecessary restart or rebuild
