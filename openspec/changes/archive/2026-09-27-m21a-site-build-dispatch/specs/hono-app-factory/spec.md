## ADDED Requirements

### Requirement: Administrator build routes preserve the actor boundary
The HTTP application SHALL expose versioned authenticated administrator routes for manual build request and failed-build retry. Routes SHALL validate the shared request and response contracts and call actor-checked application commands. They SHALL not synchronously run a build.

#### Scenario: Administrator queues a build
- **WHEN** an authenticated administrator posts a valid manual build request
- **THEN** the route returns the durable queue receipt without waiting for a build trigger

#### Scenario: Editor attempts retry
- **WHEN** an authenticated editor posts a retry for a failed build
- **THEN** the route denies the action without enqueueing work
