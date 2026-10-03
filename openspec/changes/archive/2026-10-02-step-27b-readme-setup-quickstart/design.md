## Context

See proposal.md for motivation. `create-lace` stages allowed entries before exclusively writing inventory templates. Adding README naively would collide with the staged existing file. Operations already contains the complete workflow and a private-input Bash/Node setup request. Root scripts run Compose API and the user-owned Astro site; the current source template is 0.5.0, while package/image coordinates still identify alpha.1. This ownership/security ambiguity warrants an explicit design.

## Goals / Non-Goals

**Goals:** Give new projects an immediately usable quickstart; retain existing README bytes and upgrade ownership; offer a short inspectable setup request; verify documentation against actual generated scripts and HTTP request shape.

**Non-Goals:** Change runtime composition or endpoint semantics, release new artifacts, claim doctor is a complete readiness oracle, or deliver later roadmap capabilities.

## Decisions

1. Add `templates/README.md` as user-owned. When the validated allowed entries already contain README, record user ownership and skip only that template write. Keep staged copying, exclusive writes for every other template, revalidation and recovery intact. Return a preservation flag for CLI output. Managed README or automatic appended links would overwrite user prose; a second duplicated managed quickstart is unnecessary because operations already survives every generation.
2. README covers the full normal setup path concisely and links detailed/private setup input in the managed operations guide. CLI explicitly announces the fallback and manual incorporation for preserved README; operations explains the ownership rule. Tests compare preserved buffers (including non-UTF8 bytes), default/Cloudflare manifests and injected failures.
3. Use an HTTPS `PUBLIC_API_BASE_URL` placeholder followed by `api/v1/setup/admin`; tell consumers to replace it with `LACE_PUBLIC_BASE_URL` including its trailing slash/prefix. Keep JSON fields as inline placeholders, with the shell-history/process warning adjacent and the private-input script still available. Execute extracted documented curl commands against a controlled loopback server and assert prefixed URL, method and exact JSON fields. No real credentials or provider calls.
4. Root scripts and loader paths define the documented commands. State explicit migration/sync and service startup before HTTP setup; publish Home and issue a Settings token before Astro. Document dev export caching as the current behavior, leaving Step 29 verification separate. Compose keeps generated `site/`; Pages does not imply CMS Worker delivery. Note source-vs-published artifact constraints prominently instead of claiming alpha.1 includes this work.
5. Bump source template to 0.6.0 for inventory/managed-guide changes and regenerate both snapshot fixtures. Keep npm/image coordinates unchanged. Update generator package documentation and record Step 27B verification.

## Risks / Trade-offs

- [README becomes stale after user edits] → User ownership intentionally preserves edits; managed operations remains authoritative and later units reconcile documentation.
- [Inline secrets enter history] → Placeholder-only request, adjacent warning and existing private-input alternative.
- [Quickstart overstates release/runtime support] → Explicit artifact prerequisite, existing-site and Cloudflare limits and server-only token rules.
- [Existing README collision or failure loses content] → Skip its exclusive template write, preserve staged bytes and exercise existing recovery hooks.
- [Doctor refuses active SQLite WAL inspection] → Refer to separate API readiness and detailed doctor limitations rather than promising every ready-stage check passes.

## Migration Plan

No database/config schema or API migration. Fresh generation uses 0.6.0. Existing README remains user-owned, so upgrade preserves it; consumers incorporate setup text explicitly from operations. Managed-guide upgrades use existing hash/conflict review. Verify focused generator/onboarding tests, default/Cloudflare snapshots and root checks, then sync the two delta specs, archive and commit. Reverting this branch commit restores source templates/specs; no consumer database rollback is involved.
