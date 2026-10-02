## ADDED Requirements

### Requirement: Local environment preparation creates protected credentials explicitly
The CLI SHALL provide `lace env prepare [--json]` in the current project root, without requiring an existing `.env`, target credentials, runtime services or database access. It SHALL reject target/check/extra arguments using USAGE and exit 3. It SHALL read a regular non-symlink `.env.example`, require exactly one single-line assignment for each of the four generated credential names and `LACE_BUILD_TOKEN`, preserve every other template byte, and never execute template contents or copy credentials from process environment. Missing or invalid templates SHALL return CONFIG and exit 4. It SHALL generate independent cryptographically random values: at least 256 bits for `LACE_AUTH_SECRET`, `LACE_MINIO_ROOT_SECRET` and `LACE_BUILDER_SECRET`, and at least 112 bits in a 20-character alphanumeric `LACE_MINIO_ROOT_ACCESS_KEY`. `LACE_BUILD_TOKEN` SHALL be empty until issued in Settings.

#### Scenario: Preparation before configuration exists
- **WHEN** a fresh consumer runs preparation with no `.env` or database settings
- **THEN** it creates service-compatible credentials, leaves the build token empty and preserves URLs, images, ports, database path, comments and other settings

#### Scenario: Template cannot be safely used
- **WHEN** `.env.example` is missing, a symlink, not regular, or lacks unique single-line controlled assignments
- **THEN** preparation fails with sanitized template recovery guidance and creates no `.env`

#### Scenario: Preparation cannot select remote infrastructure
- **WHEN** an operator supplies `--target cloudflare-remote`, `--check` or extra positional arguments
- **THEN** preparation returns USAGE without modifying local or remote state

### Requirement: Environment publication preserves existing files and exposes no partial credentials
Preparation SHALL publish only a fully written `.env`, with owner-only permissions (`0600` on POSIX), without replacing an existing file, directory or symlink. Concurrent creators SHALL have exactly one successful publication. Existing destinations SHALL return OPERATION_FAILED and exit 6 with recovery advice to retain/edit the existing file, without reading or exposing its contents. Write/publication failures SHALL leave no partial `.env` and SHALL clean temporary output during normal error handling. A process killed before publication SHALL leave no `.env`; any private staging remnants SHALL be documented. Outputs SHALL print no credentials or template values. Success SHALL use ENV_PREPARED and exit 0; JSON SHALL be one result object on stdout. Failures SHALL retain the accepted operation/reason/nextAction diagnostics with `operation` equal to `env prepare`.

#### Scenario: Repeated preparation preserves operator edits
- **WHEN** preparation runs with an existing `.env`, including an empty file or symlink
- **THEN** the destination and any linked file remain unchanged and the command reports safe recovery without revealing their contents

#### Scenario: Two processes prepare concurrently
- **WHEN** two preparations race to create `.env`
- **THEN** one succeeds, the other refuses overwrite, and the destination contains one complete set of credentials with owner-only permissions

#### Scenario: Failure before publication
- **WHEN** writing, syncing or publishing staged output fails
- **THEN** no partially written destination is visible, temporary files are cleaned during normal error handling, and sanitized output contains no credential or raw exception text
