## ADDED Requirements

### Requirement: Versioned build read routes expose persisted history
The HTTP application SHALL expose authenticated `GET /api/v1/admin/site-builds` and `GET /api/v1/admin/site-builds/:buildId` routes with shared validated response contracts. A missing build SHALL return the standard not-found envelope. Existing administrator build request and retry routes SHALL remain compatible.

#### Scenario: History request
- **WHEN** an authenticated actor requests the list
- **THEN** the route returns a bounded newest-first list of validated build records

#### Scenario: Missing detail
- **WHEN** an authenticated actor requests an unknown build ID
- **THEN** the route returns the standard 404 response
