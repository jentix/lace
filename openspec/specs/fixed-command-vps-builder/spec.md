# fixed-command-vps-builder Specification

## Purpose

Defines the private VPS service that turns a durable Lace build request into a static Astro release without exposing commands, paths, or secrets to HTTP callers.

## Requirements

### Requirement: Private trigger accepts a closed request shape
The builder SHALL require a dedicated API-to-builder secret and SHALL accept only a build ID and a non-negative integer target published-state version. It SHALL reject other fields and unauthenticated requests without starting a build.

#### Scenario: Authorized request
- **WHEN** the API sends the dedicated secret and a valid build ID and target version
- **THEN** the builder accepts the fixed build request

#### Scenario: Unauthorized or extended request
- **WHEN** a caller has no valid secret or supplies command, path, environment, or other fields
- **THEN** the builder rejects the request before any work begins

### Requirement: Builder runs a fixed isolated build
The builder SHALL copy the read-only mounted installation into disposable work space, install from its root frozen lockfile with an image-pinned toolchain, and run the image-defined direct Astro build for its explicitly selected project and output directory. It SHALL support generated, external standalone and external pnpm workspace selections without guessing between example layouts. Request data SHALL never select a command, filesystem path, argument or environment value. Operator source selection SHALL NOT provide a command or executable override. The resulting output SHALL be a complete static site with a regular `index.html`; symlinks and special files SHALL be rejected before release publication. The built site SHALL match the requested published-state version before release publication.

#### Scenario: Successful build
- **WHEN** the fixed install and Astro build succeed for the requested version
- **THEN** the builder stages a complete static release from the selected output

#### Scenario: Source or version failure
- **WHEN** installation or build fails, or the published-state version differs from the requested version
- **THEN** no new release becomes current

#### Scenario: Example differs from selected site
- **WHEN** a mounted external Astro project and its generated CMS example contain distinct page markers
- **THEN** the published release contains the selected project's marker and not the example's marker

#### Scenario: Extended trigger cannot override deployment selection
- **WHEN** a caller supplies a valid secret but extends the trigger with paths, commands, arguments or environment fields
- **THEN** the closed request contract rejects the call without running install or build

#### Scenario: Failure and retry preserve release atomicity
- **WHEN** a selected-site build fails after a successful release and the administrator retries after correcting the source
- **THEN** the old complete release remains served throughout failure and is replaced only by the complete successful retry

#### Scenario: Concurrent triggers use the same selected site
- **WHEN** multiple authorized build requests arrive concurrently
- **THEN** they execute serially using the deployment's single selection and retain the existing version checks and atomic release switch

### Requirement: Successful releases switch atomically
The builder SHALL publish a complete release by atomically replacing the `current` pointer after success, keep the previous successful release, and remove older releases according to a fixed retention policy. Concurrent trigger requests SHALL execute serially. A failed request SHALL leave the current release intact.

#### Scenario: Build succeeds after an existing release
- **WHEN** a new build succeeds with a current release present
- **THEN** readers see either the complete old release or the complete new release, and the previous release remains available

#### Scenario: Build fails after an existing release
- **WHEN** a subsequent build fails
- **THEN** the current pointer and previous successful release remain unchanged

### Requirement: Builder results are bounded and sanitized
The builder SHALL return a synchronous success or failure result with a bounded, fixed-vocabulary log summary to its trusted API caller without exposing secret values, arbitrary command output, filesystem source paths, or environment dumps. Health status SHALL be available without revealing secrets.

#### Scenario: Tool fails with sensitive output
- **WHEN** install or build output includes a secret or an internal path
- **THEN** the response contains only a bounded safe failure code
