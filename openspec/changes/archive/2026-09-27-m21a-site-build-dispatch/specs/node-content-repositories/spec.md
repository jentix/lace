## ADDED Requirements

### Requirement: Node build claims and outcomes are atomic
The Node SQLite adapter SHALL claim site-build work and create or recover its build row in one transaction. It SHALL preserve the target version captured at claim, use lease-guarded transitions, and atomically record retry or terminal outcome with the event. A new publication after claim SHALL enqueue separate unclaimed work.

#### Scenario: Two workers race to claim a build
- **WHEN** two Node workers concurrently claim one available build event
- **THEN** only one holds the lease and exactly one build row is created for that event

#### Scenario: Old worker completes after reclaim
- **WHEN** an expired build lease is reclaimed and its former worker reports success
- **THEN** the former worker changes neither the recovered event nor its build row
