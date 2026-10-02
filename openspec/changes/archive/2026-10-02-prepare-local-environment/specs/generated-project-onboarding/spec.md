## ADDED Requirements

### Requirement: Generated local preparation runs before environment loading
Generated projects SHALL expose `pnpm env:prepare` invoking the packaged `lace env prepare` without `--env-file=.env`. The operations guide SHALL place preparation after dependency installation and before environment-loaded migration, sync and bootstrap scripts. It SHALL explain generated service credentials, preservation/refusal of existing `.env`, file protection, review of non-secret local settings, and the empty build token pending Settings issuance. Preparation SHALL be verified with packed packages outside the source workspace. Template artifacts and ownership metadata SHALL remain deterministic and credential-free; runtime `.env` and private staging remnants SHALL be ignored by source control.

#### Scenario: Installed generated consumer starts from the guide
- **WHEN** a consumer installs packed packages and runs its generated preparation script without `.env`
- **THEN** preparation succeeds without source-workspace imports and later environment-loaded commands can use the preserved database and service settings

#### Scenario: Existing consumer configuration
- **WHEN** a consumer with an existing `.env` follows the guide
- **THEN** the guide directs them to retain and review it, and explains that preparation refuses replacement and does not rotate credentials
