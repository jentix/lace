## ADDED Requirements

### Requirement: Publication response reports durable queueing
The shared publication response contract SHALL distinguish a newly queued build
request from an idempotent replay, and SHALL report the queued published-state
target version. It SHALL not report provider acceptance before the dispatcher
invokes the trigger.

#### Scenario: Publication commits before dispatch
- **WHEN** publication commits while the trigger is offline
- **THEN** the response reports publication success and a queued build target
  instead of claiming provider acceptance

### Requirement: Build request and retry HTTP contracts are explicit
The shared REST contracts SHALL define strict, versioned administrator build request and failed-build retry inputs and durable queue receipt outputs. Responses SHALL expose the queued target version and coalescing status, and errors SHALL use the shared envelope. Inputs SHALL reject command, path, environment, and arbitrary argument fields.

#### Scenario: Valid manual request
- **WHEN** an administrator submits an empty build request to the versioned admin endpoint
- **THEN** the validated response identifies the durable queue receipt and target version

#### Scenario: Arbitrary build override supplied
- **WHEN** a request includes a command, path, environment, or arbitrary argument field
- **THEN** contract validation rejects the request before enqueueing work
