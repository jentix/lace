## Why

Roadmap session 25C must prove the exact prepared alpha artifacts work as an independent local consumer before publication. Existing acceptance repacks the workspace and omits role boundaries, restart persistence and failed-build recovery.

## What Changes

- Add inventory-based acceptance of the thirteen alpha archives and matching immutable API/builder images, including generation through the packed generator.
- Exercise media reuse, five-block output, draft isolation, restricted actors and narrowly scoped build credentials.
- Verify database/object persistence across service recreation and successful Compose release, failure preservation and explicit retry.
- Inspect shipping artifacts, static output and diagnostics for secret exclusion; record artifact identity and reproducible verification results.
- Preserve existing local Node/D1 and Worker coverage and document the remaining Step 26 release gate.

## Capabilities

### New Capabilities

- `prepublication-consumer-security`: exact-artifact consumer acceptance and essential security/recovery evidence.

### Modified Capabilities

None. Existing generated-project acceptance remains available; the new release mode strengthens its coverage without changing delivered templates.

## Impact

Acceptance scripts/tests, root commands, alpha release guide and verification evidence. Depends on completed 25A/25B and accepted `alpha-release-artifacts`, `generated-project-acceptance`, `generated-project-onboarding`, `bootstrap-user-token-abuse-controls`, `site-build-dispatch` and `fixed-command-vps-builder`. Architecture sections 4, 7, 10, 12–14 and 20 govern isolation, publication and credentials. No API changes, registry publication, full browser suite, remote VPS, real Cloudflare deployment or Step 26 certification.
