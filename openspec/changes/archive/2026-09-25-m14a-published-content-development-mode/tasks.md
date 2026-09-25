## 1. Local live-mode wiring

- [x] 1.1 Pass explicit site mode, build credential, internal API URL, and browser-facing media origin through the local Compose/site boundary; verify first-start fixture mode and configured live mode with focused configuration tests or rendered Compose output.
- [x] 1.2 Preserve `dev:smoke` bootstrap isolation when an ordinary local `.env` selects live mode; verify the isolated smoke environment still starts in fixture mode and removes only its own resources.
- [x] 1.3 Repair the existing local first-admin bootstrap entry point's package resolution and verify an isolated Compose API container mints a setup credential through the documented command.

## 2. Published export and failures

- [x] 2.1 Use the existing SDK once for live export and produce browser-reachable public-media URLs while keeping the credential server-side; verify request count, Authorization scope, output URL, and fixture isolation in site tests.
- [x] 2.2 Add actionable, credential-safe diagnostics for missing/rejected token, unreachable API, and absent published home; verify each failure in focused site tests.

## 3. Contributor workflow and verification

- [x] 3.1 Document administrator token creation through the existing API, ignored local configuration, site restart/refresh, and draft-versus-published behavior in README and local guides; verify commands, endpoint names, and environment keys against implementation.
- [x] 3.2 Verify the live local path with a focused stack or browser-level check where Docker is available, then run root typecheck, Oxlint, Oxfmt check, and strict OpenSpec change validation.
