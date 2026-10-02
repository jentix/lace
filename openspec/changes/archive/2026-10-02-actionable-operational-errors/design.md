## Context

See proposal.md. `bin.ts` preserves CliError/UpgradeError but collapses other errors. Sync and upgrade also return unsuccessful outcomes rather than throwing. Schema helpers catch every ledger-query failure; Node `access` likewise labels every failure as missing. Both security adapters currently throw the exact fixed message `Setup already completed.` inside their guarded token creation.

## Goals / Non-Goals

**Goals:** Centralize failure presentation in the CLI, preserve command behavior and existing success/data contracts, and classify errors at boundaries where their cause is known.

**Non-Goals:** Runtime/API error redesign, automatic mutation/retry, migrations, additional CLI commands, provider-output forwarding or changes to accepted upgrade diffs/guidance.

## Decisions

1. Add a CLI diagnostic module with a finite command vocabulary (`db migrate`, `content sync`, `auth bootstrap`, `upgrade`, `cli`) and fixed recovery catalog. Extend CliError with an optional trusted diagnostic category. Presentation appends operation/reason/nextAction in text and adds the three fields in JSON only for failures. Preserve trusted existing CLI messages, upgrade reports, diffs and guidance. The existing upgrade `recovery` object remains unchanged; `nextAction` avoids a field collision. This is additive; replacing symbolic codes would break automation.
2. Classify filesystem errors from allowlisted errno/SQLite codes. Match only bounded known database schema signatures, including nested causes from local D1; do not stringify unknown exceptions. Propagate unrelated schema-check failures to the fallback instead of reporting schema drift. Remote transport uses trusted HTTP status and narrowly recognizes a missing migration ledger from provider error metadata without echoing its body. Unknown provider errors stay generic. Wrangler spawn errors may be classified by errno, but nonzero subprocess output is never parsed or forwarded.
3. Translate the exact fixed completed-setup error only at bootstrap token creation; keep its existing guarded atomic service operations unchanged. No preflight setup check or changes to platform security contracts are necessary.
4. Decorate both returned sync/upgrade failures and thrown errors. Catalog guidance covers pending/blocked plans, manifest/pristine-input requirements, lock ownership and retained recovery metadata. Preserve upgrade's accepted data/diffs and do not copy those bytes into diagnostic fields.
5. Responsibility stays in `packages/cli`; dependencies and package direction remain unchanged. Recovery text retains explicit target selection, including local/remote D1, and never suggests remote fallback or changing manifest hashes to bypass conflicts.

## Risks / Trade-offs

- Provider error shapes vary → classify only recognizable missing-ledger signatures; otherwise report safe D1 failure rather than guessing.
- Permission tests under elevated users can be misleading → use actual denied paths where supported and injected allowlisted errors for deterministic coverage.
- Catch-all schema checks previously emitted exit 5 even for outages → correct classification uses the existing operation failure code 6; genuine missing/outdated schema remains 5.
- Upgrade review already exposes managed-file diffs by accepted contract → preserve those explicit reports; new diagnostics use fixed text and never dump arbitrary error/subprocess data.

## Migration Plan

No database or manifest migration. Deploy the rebuilt CLI package; automation can ignore new failure fields. Rollback restores the prior CLI. Validate focused binary/transport and full CLI regressions, root typecheck/lint/format and strict OpenSpec change validation before syncing and archiving.
