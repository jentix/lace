## ADDED Requirements

### Requirement: Local site can enter published-content development mode
The local Node stack SHALL support an explicit live site mode that reads the local published build export through the existing read-only build credential. The credential SHALL be available only to the server-side site process and SHALL not be embedded in browser output. A fresh stack without a build credential SHALL still support the first-admin and credential-creation workflow. Fixture mode SHALL remain available for isolated tests and setup.

#### Scenario: Contributor configures live mode
- **WHEN** a contributor supplies a valid local build credential and starts the site in live mode
- **THEN** the same-origin site renders only the content in the local published export through the existing SDK

#### Scenario: Fresh installation has no credential
- **WHEN** a contributor starts a fresh local stack before creating the first administrator or build credential
- **THEN** the stack remains usable for bootstrap and credential creation without exposing a default build credential

#### Scenario: Browser requests the site
- **WHEN** a browser opens a local site route in live mode
- **THEN** the browser response contains neither the build credential nor a client-side request bearing it

### Requirement: Local publication refresh and credential setup are documented
The developer guide SHALL explain how an administrator creates a read-only build token through the existing admin API, configures the local server-side site process without committing the plaintext token, and refreshes or restarts the site after publication. It SHALL explain that saving a draft does not change public site content and that automated build dispatch is not yet part of this workflow.

#### Scenario: Contributor publishes a changed draft
- **WHEN** a contributor follows the guide after publishing an edited entry
- **THEN** the documented refresh or restart step displays the new published content without editing the fixture

#### Scenario: Contributor saves without publishing
- **WHEN** a contributor saves a draft and follows the same refresh or restart step
- **THEN** the public site continues displaying the prior published content
