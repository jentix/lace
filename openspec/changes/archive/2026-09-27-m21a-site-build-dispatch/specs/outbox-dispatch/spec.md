## ADDED Requirements

### Requirement: Site-build dispatch uses fixed recovery timings
The system SHALL use a 60-second exclusive lease, full-jitter exponential retry delay starting from 5 seconds and capped at 15 minutes, and eight total attempts for site-build dispatch. Timing values SHALL be centralized and deterministic under an injected clock and random sample.

#### Scenario: Expired build lease is recovered
- **WHEN** a site-build dispatcher terminates with an unfinished lease and 60 seconds pass
- **THEN** a later dispatcher can reclaim that event while the old lease can no longer complete it

#### Scenario: Retry delay is bounded
- **WHEN** a failed attempt schedules a retry
- **THEN** its delay lies within the full-jitter exponential bound for that attempt and never exceeds 15 minutes
