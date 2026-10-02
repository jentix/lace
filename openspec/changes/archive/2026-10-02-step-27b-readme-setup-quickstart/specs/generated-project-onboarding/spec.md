## ADDED Requirements

### Requirement: Root quickstart describes the delivered consumer workflow

The generated root README SHALL describe compatible Node/pnpm, Docker Compose and matching release prerequisites; dependency installation; protected environment preparation before environment-loaded scripts; settings/origins; setup-stage doctor; explicit migration and configuration sync; API start; bootstrap and first-admin creation; login and Settings-issued build token; Home publication; Astro development/static build; Compose operation and stop commands that preserve data. It SHALL explain root `lace.config.ts`, Home/Posts models, user-owned routes, SDK export loading, renderers, layouts and styling, linking to `docs/lace-operations.md` for detailed operation and private setup input. It SHALL distinguish draft save, publication and static deployment, identify generated `site/` as the current builder source, and explain that `--cloudflare` supplies Pages configuration rather than complete CMS Worker onboarding. It SHALL state that source-template behavior requires matching freshly built packages/images or a later compatible release and is not retroactively added to published alpha artifacts.

#### Scenario: Consumer starts from README
- **WHEN** a fresh consumer follows README with compatible artifacts
- **THEN** preparation precedes migration/sync, the consumer can complete first-admin setup and Home publication, and the site can read published content with a server-only build token using documented commands

#### Scenario: User extends the site
- **WHEN** the consumer adds a model or custom block
- **THEN** README explains explicit sync and user-owned route/renderer work, identifies the layout and SDK loader, and refers to the operations guide for guarded structural changes

#### Scenario: Later roadmap capabilities are absent
- **WHEN** a consumer reads the Cloudflare, setup or builder sections
- **THEN** the guide describes the existing API setup and generated-site/Pages support without promising browser setup, external-site selection or a generated CMS Worker deployment

### Requirement: Concise setup example uses placeholders and the configured public origin

README and operations SHALL include the same short placeholder-only `curl` example for `POST /api/v1/setup/admin` with JSON `token`, `email` and `password` and a placeholder configured public API base URL retaining its optional path prefix. Adjacent guidance SHALL explain obtaining the one-time expiring token via bootstrap, a 12-character password minimum, completed-setup closure, shell-history/process exposure when replacing inline placeholders, and the existing private-input script as the safer practical option. Examples SHALL contain no usable credentials and SHALL NOT weaken server setup authorization or imply a setup token is a build token.

#### Scenario: Request shape and configured origin
- **WHEN** a consumer replaces placeholders with test values and an API base URL including a path prefix
- **THEN** the example sends a JSON POST to that prefix plus `/api/v1/setup/admin` with exactly token, email and password

#### Scenario: Expired or already consumed setup
- **WHEN** setup fails because a token expired or setup already completed
- **THEN** the guide directs unfinished setup to bootstrap again and completed setup to existing-admin login without reopening registration
