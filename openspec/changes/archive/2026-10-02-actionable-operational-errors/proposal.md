## Why

Roadmap Step 26, session 26B needs actionable failures after the fresh-migration work in 26A. Operators currently receive a generic failure for filesystem errors and completed bootstrap, while schema checks can misreport infrastructure outages as missing migrations.

## What Changes

- Add failure-only top-level `operation`, `reason`, and `nextAction` strings to operational and upgrade JSON responses; human failures display the same diagnostic with existing messages/reports.
- Classify known filesystem, schema, configuration, sync, bootstrap, D1 transport and upgrade failures using trusted metadata and fixed recovery guidance. Preserve existing symbolic and process codes, including pending sync and upgrade conflicts.
- Keep unknown failures sanitized and preserve the successful bootstrap's intentional token response.
- Test both output modes, failure-state preservation, and Node/local/remote Cloudflare diagnostics. Document the additive contract.
- Scope excludes 26C environment preparation, doctor, new migrations, automatic recovery/mutation, generator changes and release publication. Depends on completed Steps 23–25 and 26A.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `operational-cli`: actionable failure diagnostics shared by migration, sync, bootstrap and upgrade.

## Impact

Primarily `packages/cli` command boundaries, transport, presentation, tests and README. Architecture §§4.5, 6, 7, 14, 21 and 22 remain unchanged: portable adapters, protected user source, explicit migrations, token safety and sanitized errors. Accepted `upgrade-planner` and `upgrade-apply-recovery` behavior is retained; no dependency or persisted-format changes.
