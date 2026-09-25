## ADDED Requirements

### Requirement: Administrator can read a small operational status
The server SHALL expose `GET /api/v1/admin/settings/status` to an authorized administrator. Its validated response SHALL report readiness and the number of configured content models. It SHALL reveal no connection string, credential, or private configuration value. An editor or viewer SHALL receive the standard authorization denial.

#### Scenario: Administrator reads status
- **WHEN** an authenticated administrator requests settings status
- **THEN** the response reports current readiness and configured-model count

#### Scenario: Editor requests status
- **WHEN** an authenticated editor requests settings status
- **THEN** the response denies access without returning operational status
