## ADDED Requirements

### Requirement: Live local site failures provide actionable diagnostics
Live development SHALL report a clear corrective action when the build token is missing or rejected, the configured API cannot be reached, or the published export lacks the starter home page. Diagnostics and site output SHALL not reveal the plaintext build token. Fixture mode SHALL continue to build without an API request.

#### Scenario: Live mode has no token
- **WHEN** the site starts in live mode without a build token
- **THEN** its local error identifies the missing configuration and how to create and provide a token

#### Scenario: The API rejects the token
- **WHEN** the build-export endpoint rejects a missing, invalid, expired, or revoked build token
- **THEN** the local error identifies credential setup or replacement as the corrective action without echoing the credential

#### Scenario: The API is unavailable
- **WHEN** the site cannot reach the configured API while reading the build export
- **THEN** the local error identifies the API endpoint and the local stack as the items to check

#### Scenario: The API recovers after an initial failure
- **WHEN** the first live export read fails before the local API is ready and a later read succeeds
- **THEN** the site retries the export instead of retaining the failed result

#### Scenario: No home page is published
- **WHEN** an otherwise valid published export contains no published `home` entry at `/`
- **THEN** the local error directs the contributor to synchronize and publish the home page
