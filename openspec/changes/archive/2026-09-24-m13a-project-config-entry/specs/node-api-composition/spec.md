## ADDED Requirements

### Requirement: Node development uses the project-owned configuration
The Node development service SHALL load the repository-root `lace.config.ts` as its code-owned content configuration and validate its normalized result before serving requests. The example configuration SHALL define the home page and posts collection using the existing typed model, field, and block contracts. The service SHALL expose the resulting model projection through its existing admin configuration API and SHALL fail startup with an actionable diagnostic when the module is missing, fails evaluation, or contains an invalid definition. No HTTP request SHALL select or evaluate a configuration module.

#### Scenario: Start with edited project models
- **WHEN** a contributor edits a valid root configuration and starts the Node development service
- **THEN** the service uses those models and their normalized projection for subsequent admin requests

#### Scenario: Reject invalid project configuration
- **WHEN** the root configuration is missing or fails normalization
- **THEN** the Node service fails before binding its listener and identifies the configuration problem without disclosing a secret

#### Scenario: HTTP cannot choose executable configuration
- **WHEN** a request supplies a path or code intended to replace the project configuration
- **THEN** the service continues using only the configuration loaded at startup
