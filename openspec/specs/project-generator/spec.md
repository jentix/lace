# Project Generator

## Purpose

The project generator creates a fresh, upgrade-aware Lace project while protecting existing user files and separating user-owned source from managed infrastructure.

## Requirements

### Requirement: The generator accepts only safe project targets

The `create-lace` executable SHALL support `create <dir>` for a new project, bare `<dir>` as the `pnpm create lace <dir>` shorthand, and `init .` for the current directory. It SHALL resolve the target to an absolute path and SHALL reject a file, a symbolic-link target, an existing directory containing anything other than `.git`, `README.md`, and `LICENSE`, missing or extra positional arguments, and unsupported flags. It SHALL NOT follow an allowed entry that is a symbolic link.

#### Scenario: New directory
- **WHEN** a user runs `create-lace create my-site` and that path does not exist
- **THEN** a project is created at its resolved path

#### Scenario: pnpm create shorthand
- **WHEN** a user runs `pnpm create lace my-site` and that path does not exist
- **THEN** the executable creates the same project as `create-lace create my-site`

#### Scenario: Existing empty repository
- **WHEN** a user runs `create-lace init .` in a directory containing only `.git` and `README.md`
- **THEN** both existing entries remain byte-identical and the project files are added

#### Scenario: Existing work is protected
- **WHEN** the target has any other entry, is a symlink, or a preserved entry is a symlink
- **THEN** the command exits unsuccessfully with a clear target error and does not change the target

### Requirement: Generated projects separate owned source and managed files

The generator SHALL produce user-owned `site/**` Astro source and typed root `lace.config.ts`, root pnpm workspace files, `.env.example`, Docker Compose infrastructure, and `.lace/manifest.json`. It SHALL offer optional Cloudflare configuration and workflow files through `--cloudflare`. The generated project SHALL reference the Lace engine and admin as versioned dependencies or images and SHALL NOT contain editable engine or admin source. Templates and manifest SHALL contain no credentials, tokens, or usable secrets.

#### Scenario: Default project
- **WHEN** a user generates a project without optional flags
- **THEN** the project has editable site/configuration and managed Node/VPS workspace and deployment files, with no Cloudflare workflow

#### Scenario: Cloudflare project
- **WHEN** a user generates a project with `--cloudflare`
- **THEN** Cloudflare config and workflow files are present and classified as managed

### Requirement: Ownership metadata is deterministic and verifiable

The manifest SHALL identify its schema and template version and classify every generated template file as `user` or `managed`. It SHALL record the lowercase SHA-256 digest of the exact bytes of each managed file and SHALL record no digest for user-owned files. The manifest itself is metadata and SHALL NOT hash itself. For the same template version and options, generated managed-file bytes and manifest contents SHALL be stable apart from project-name substitutions specified by the template.

#### Scenario: Ownership audit
- **WHEN** a project is generated and each managed file is hashed
- **THEN** every digest matches the manifest and no user-owned file has a digest

#### Scenario: Repeat generation
- **WHEN** the generator creates two projects with the same name and options in different parents
- **THEN** their generated file bytes and manifests are identical

### Requirement: Generation preserves the target on failure

The generator SHALL stage a complete project in a sibling temporary directory before publishing it. For an allowed existing directory, it SHALL preserve the original entries and restore the original directory if publishing fails. On any failure, it SHALL report the error and any remaining staging or backup path with cleanup or recovery instructions. A failed command SHALL never claim success.

#### Scenario: Staging failure
- **WHEN** a template write fails before publication
- **THEN** the original target is unchanged and no partial generated tree appears there

#### Scenario: Publish failure for init
- **WHEN** publication of a staged `init .` project fails after the original is moved aside
- **THEN** the original directory is restored or the command identifies the exact backup path and recovery action

### Requirement: Generated project starts its packaged runtimes

The generated project SHALL include documented commands to run its Node development API and Astro site with its own `lace.config.ts`, and a Docker Compose production configuration that accepts versioned engine image references and supplies the generated configuration to the API. The project SHALL keep editable admin and engine source outside its tree.

#### Scenario: Generated Node development
- **WHEN** a user installs the generated project and runs its documented Node development command after setting required local values
- **THEN** the API loads that project's `lace.config.ts` and serves its API without importing the Lace source workspace

#### Scenario: Generated Compose deployment
- **WHEN** a user supplies compatible API and builder image references and required secrets to the generated Compose configuration
- **THEN** the services can use the generated project's configuration and persistent data without copying engine or admin source into the project
