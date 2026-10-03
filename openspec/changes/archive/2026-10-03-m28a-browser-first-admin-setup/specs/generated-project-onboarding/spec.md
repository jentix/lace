## MODIFIED Requirements

### Requirement: Local onboarding documents the supported complete sequence
Generated projects SHALL document generation, dependency installation, environment configuration, explicit migrations and content sync, one-time bootstrap, first-admin creation, login, build-token creation, publication, editable Astro development, static build and Compose operation using packaged runtimes without engine source. First-admin instructions SHALL direct consumers to obtain an operator-issued one-time token with the supported bootstrap command, open `/admin/`, and complete the browser setup form before ordinary sign-in. They SHALL retain a placeholder-only API alternative with the exact `POST /api/v1/setup/admin` endpoint and `token`, `email`, and `password` fields, explain the one-hour token expiry and 12-character password minimum, and cover expired-token reissue, interrupted retries with the same token/email, and completed setup remaining closed. Documentation SHALL distinguish setup tokens, build tokens and passwords, supply no usable credentials, and describe preservation of content when stopping services.

#### Scenario: Fresh consumer follows local instructions
- **WHEN** a consumer has compatible packages/images and follows the generated operations guide
- **THEN** they can create the first administrator through the browser with token, email and password (or the documented setup API alternative), then sign in at /admin/, publish content and build the site without an engine checkout or undocumented request

#### Scenario: Setup is complete or token expired
- **WHEN** a consumer attempts bootstrap after setup completion or uses an expired setup token
- **THEN** the guide explains that completed setup refuses bootstrap and expired setup requires a newly issued token, without suggesting default credentials
