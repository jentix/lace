## ADDED Requirements

### Requirement: Publication-visibility template upgrade protects ownership
The generator SHALL advance the managed template version to `0.8.0`, deliver a web proxy that serves site responses with `Cache-Control: no-cache`, deliver updated managed operations guidance and template upgrade instructions, and retain deterministic managed hashes and existing conflict detection. New projects SHALL receive the dev-revalidating user-owned site loader and slug-based post route. Upgrades SHALL preserve user-owned README, `lace.config.ts` and site source; instructions SHALL describe adopting dev revalidation manually and SHALL NOT require new API, admin, CLI or builder artifacts for the proxy and documentation changes.

#### Scenario: Upgrade from 0.7.0
- **WHEN** a consumer with unmodified 0.7.0 managed files applies the 0.8.0 template upgrade
- **THEN** the proxy and operations guide are updated, instructions mention the revalidating cache header and manual dev-loader adoption, and user README, configuration and site files are unchanged

#### Scenario: Edited proxy configuration
- **WHEN** the consumer has modified `deploy/nginx.conf`
- **THEN** the upgrade reports a managed-file conflict instead of overwriting it
