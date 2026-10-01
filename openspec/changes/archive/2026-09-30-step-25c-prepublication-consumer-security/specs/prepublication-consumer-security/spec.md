## Purpose

Proves an exact prepared alpha release supports an independent local consumer while preserving essential authorization, publication isolation, credentials and build recovery.

## ADDED Requirements

### Requirement: Acceptance consumes one verified artifact inventory
Release acceptance SHALL require a complete clean-source inventory, verify archive checksums, package contents and selected platform image identity/version/revision, and generate using the packed generator. It SHALL install the exact packed dependency graph outside the engine checkout with test-only resolution overrides, reject source-workspace resolution, and leave delivered templates and ownership metadata unchanged. Each run SHALL isolate its project, ports and volumes and clean them on success or failure.

#### Scenario: Exact clean artifacts
- **WHEN** a complete clean-source alpha inventory and supported platform are supplied
- **THEN** acceptance uses its exact packages and API/builder image IDs and records their source identity and versions

#### Scenario: Ineligible or altered artifacts
- **WHEN** the inventory is partial, preview, checksum-mismatched or has mismatched image metadata
- **THEN** acceptance fails before advertising release acceptance success

### Requirement: Consumer content and persistence journey passes
Acceptance SHALL exercise generation, installation, migration, sync, bootstrap, login, draft editing, upload and reuse of media, publication and Astro output. It SHALL check all five built-in blocks and fetch rendered media from the browser-facing URL. After stopping and recreating local services without deleting storage, database content and original object bytes SHALL remain available.

#### Scenario: Services are recreated
- **WHEN** published content and reused media exist and consumer services are stopped and recreated
- **THEN** the same content identifiers, published data and uploaded object bytes remain readable

### Requirement: Essential authorization and snapshot isolation pass
Acceptance SHALL verify editor and viewer publication denial, anonymous draft/admin denial, and build-token access to published export only without admin/draft permissions. A later unpublished draft SHALL not change public export or generated output. Setup credentials SHALL cease working after setup and token listings SHALL exclude plaintext build credentials.

#### Scenario: Restricted consumers request protected operations
- **WHEN** editor/viewer sessions attempt publication or anonymous/build-token consumers request drafts or admin resources
- **THEN** authorization fails and published state remains unchanged

#### Scenario: Draft changes after publication
- **WHEN** a later draft changes the title and blocks without publication
- **THEN** published export and rebuilt static output retain the earlier published snapshot

### Requirement: Compose build failure preserves a recoverable release
Acceptance SHALL exercise the generated dispatcher/builder path and observe a succeeded durable build with served output. A controlled subsequent build failure SHALL preserve the previous served release, reach terminal failure and permit administrator retry. A recovered retry SHALL reach success and serve the latest published content. Test-only retry scheduling acceleration SHALL be explicit and SHALL not alter production policy or content.

#### Scenario: Failed build is retried
- **WHEN** a build fails after an existing successful release and the failure cause is corrected
- **THEN** the old release remains served during failure and an explicit retry produces a new successful release

### Requirement: Secret exclusion and release evidence are explicit
Acceptance SHALL inspect generated shipping files, extracted package archives, selected image filesystems/configuration, static output and captured diagnostics for test credentials and secret material. Secret detections SHALL fail without echoing values; expected operator .env and persistent auth storage SHALL remain outside shipping scans. Evidence SHALL record exact artifact/source identities, platform, checks and results, preserve relevant local Node/D1 and Worker coverage, and explicitly exclude registry publication, real Cloudflare deployment and stable Step 26 certification.

#### Scenario: Secret reaches shipping output or diagnostics
- **WHEN** a setup password, token or deployment secret occurs in a shipping surface or captured diagnostic
- **THEN** acceptance fails with the affected surface identified and the value redacted
