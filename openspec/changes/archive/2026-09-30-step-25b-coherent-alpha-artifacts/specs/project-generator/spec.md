## MODIFIED Requirements

### Requirement: Generated project starts its packaged runtimes

The generated project SHALL include documented commands to run its Node development API and Astro site with its own `lace.config.ts`, and a Docker Compose production configuration that uses the release's exact versioned API and builder image references by default and supplies the generated configuration to the API. Generated package dependencies SHALL select exact compatible alpha package versions without development placeholders or local acceptance substitutions. Operators SHALL be able to override image references explicitly. The default alpha template SHALL identify the release and its installation channel and SHALL explain that these coordinates become downloadable only after owner publication. The project SHALL keep editable admin and engine source outside its tree and SHALL require no consumer build of the Lace API or builder images.

#### Scenario: Generated Node development
- **WHEN** a user installs the generated project and runs its documented Node development command after setting required local values
- **THEN** the API loads that project's `lace.config.ts` and serves its API without importing the Lace source workspace

#### Scenario: Generated Compose deployment
- **WHEN** the matching release has been published and a user supplies required secrets to the generated Compose configuration
- **THEN** default matching API and builder image references start services using the generated project's configuration and persistent data without copying engine or admin source into the project

#### Scenario: Explicit image override
- **WHEN** an operator supplies compatible API and builder image overrides
- **THEN** Compose uses those references while preserving generated configuration mounts and persistence behavior

#### Scenario: Unpublished alpha preparation
- **WHEN** a contributor generates a project before the prepared alpha set is published
- **THEN** the guide identifies its exact alpha coordinates and publication prerequisite without claiming registry availability or directing ordinary consumers to manual tarball substitutions
