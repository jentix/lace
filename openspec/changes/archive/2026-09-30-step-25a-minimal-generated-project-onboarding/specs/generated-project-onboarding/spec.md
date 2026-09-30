## Purpose

Defines the minimal local consumer onboarding and published-content rendering delivered in generated Lace projects before alpha release preparation.

## ADDED Requirements

### Requirement: Local onboarding documents the supported complete sequence
Generated projects SHALL document generation, dependency installation, environment configuration, explicit migrations and content sync, one-time bootstrap, first-admin creation, login, build-token creation, publication, editable Astro development, static build and Compose operation using packaged runtimes without engine source. First-admin instructions SHALL use the supported setup API request with its exact endpoint and required fields until a browser setup flow exists. Documentation SHALL distinguish setup tokens, build tokens and passwords, supply no usable credentials, and describe preservation of content when stopping services.

#### Scenario: Fresh consumer follows local instructions
- **WHEN** a consumer has compatible packages/images and follows the generated operations guide
- **THEN** they can create the first administrator through POST /api/v1/setup/admin with token, email and password, sign in at /admin/, publish content and build the site without an engine checkout or undocumented request

#### Scenario: Setup is complete or token expired
- **WHEN** a consumer attempts bootstrap after setup completion or uses an expired setup token
- **THEN** the guide explains that completed setup refuses bootstrap and expired setup requires a newly issued token, without suggesting default credentials

### Requirement: Generated starter renders published exports with owned safe renderers
The generated home and posts models SHALL permit all five built-in blocks. The site SHALL derive home and canonical blog routes from one validated authenticated published export per static build, preserving block order, safe structural rich-text rendering and stable entry, block and part styling hooks. Renderers and their helpers SHALL be user-owned. Unknown blocks SHALL fail with model, entry and block identifiers. Missing home, unavailable API and rejected/missing build credentials SHALL produce actionable diagnostics without revealing credentials; failed export reads SHALL be retryable. Drafts SHALL NOT affect static output until publication. Build credentials SHALL NOT appear in static output or browser configuration.

#### Scenario: Complete published starter build
- **WHEN** the export contains published home and posts with hero, richText, image, quote and cta blocks
- **THEN** the generated site performs one export request and emits those blocks in order with stable styling hooks and public media links

#### Scenario: Unsupported or unsafe content
- **WHEN** a block lacks a renderer or rich text contains unsafe links or unsupported attributes
- **THEN** the build rejects the content with actionable context instead of emitting unsafe or partial markup

#### Scenario: Later draft exists
- **WHEN** a draft is edited after publication
- **THEN** the built title, route and blocks still come exclusively from the published export

### Requirement: Builder transport and media origins are independently configured
Generated Compose SHALL use an internal API URL for authenticated build exports and a separately configured browser-facing public API base URL for rendered media. Local Astro development/build SHALL support the same distinct settings and preserve intentional public URL path prefixes.

#### Scenario: Build inside Docker and view outside Docker
- **WHEN** the builder retrieves exports through http://api:3000/ and the public API is reachable at a host URL
- **THEN** emitted image URLs use that host URL and resolve outside Docker, while export requests use the internal URL

### Requirement: Onboarding states code-owned extension and synchronization limits
The guide SHALL explain that content configuration does not create Astro route files or custom renderers, document the styling selector contract, and explain guarded sync/check and blocked structural changes to populated models. It SHALL NOT claim automatic content migrations or complete Cloudflare CMS consumer onboarding.

#### Scenario: Consumer adds a model or custom block
- **WHEN** a consumer changes lace.config.ts
- **THEN** the guide directs them to sync explicitly and add the corresponding route/renderer in site source, and warns that incompatible populated-model changes are blocked without partial apply
