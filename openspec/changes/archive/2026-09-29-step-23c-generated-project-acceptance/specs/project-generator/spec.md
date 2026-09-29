## ADDED Requirements

### Requirement: Generated project starts its packaged runtimes

The generated project SHALL include documented commands to run its Node development API and Astro site with its own `lace.config.ts`, and a Docker Compose production configuration that accepts versioned engine image references and supplies the generated configuration to the API. The project SHALL keep editable admin and engine source outside its tree.

#### Scenario: Generated Node development
- **WHEN** a user installs the generated project and runs its documented Node development command after setting required local values
- **THEN** the API loads that project's `lace.config.ts` and serves its API without importing the Lace source workspace

#### Scenario: Generated Compose deployment
- **WHEN** a user supplies compatible API and builder image references and required secrets to the generated Compose configuration
- **THEN** the services can use the generated project's configuration and persistent data without copying engine or admin source into the project
