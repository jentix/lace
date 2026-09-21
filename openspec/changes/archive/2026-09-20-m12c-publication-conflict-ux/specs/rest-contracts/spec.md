## ADDED Requirements

### Requirement: Publication responses expose independent dispatch outcomes
The shared publish response contract SHALL validate and expose the resulting
content entry, whether the request published or replayed an idempotent prior
publication, and a portable build-dispatch outcome. The outcome SHALL
distinguish accepted (optionally with a build identity), rejected, unavailable,
and not-dispatched dispatches without reporting build completion. A validated
client SHALL be able to present publication success independently from build
dispatch state without importing application or persistence types.

#### Scenario: Publication is accepted while dispatch is unavailable
- **WHEN** publication commits successfully and its build trigger is unavailable
- **THEN** the publish response validates the published entry and an
  `unavailable` dispatch outcome, without representing publication as failed

#### Scenario: An idempotent replay is returned
- **WHEN** a publish request repeats a prior successful idempotent publication
- **THEN** the publish response validates the original entry with `replayed`
  publication state and a `not-dispatched` outcome
