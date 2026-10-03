## MODIFIED Requirements

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
