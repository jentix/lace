## Context

The admin has two Playwright suites in `apps/admin/e2e`: `editor.e2e.ts`
runs against the Vite dev server with every `/api/` request mocked per test,
and `acceptance.e2e.ts` runs against the isolated Node/SQLite/MinIO
acceptance stack (`pnpm acceptance:start`). `playwright.config.ts` selects
exactly one of those files. The theme lint (`scripts/check-admin-colors.mjs`)
scans string literals in admin `.ts`/`.tsx` and declarations in `.css`, and
has fixture-based tests in `tests/admin-colors.test.mjs`. The legacy
`apps/admin/src/app.tsx` and `components/ui.tsx` no longer exist; the
boundary check already fails on any module outside the layers. See
proposal.md for motivation.

## Goals / Non-Goals

**Goals:**

- One place that runs axe with fixed WCAG tags, used by both browser suites.
- Deterministic mocked coverage of every route and main dialog, independent
  of Docker, so the default `test:e2e` run is the accessibility gate.
- A token-bypass rule narrow enough to leave layout arbitrary values alone.

**Non-Goals:**

- Refactoring the existing `editor.e2e.ts` mocks.
- Visual snapshots, dark-mode checks, or axe runs in jsdom component tests.

## Decisions

1. **Shared axe helper in `e2e/support/accessibility.ts`.** It builds
   `AxeBuilder` with the tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`,
   `wcag22aa`, and asserts an empty violation list with a message listing
   each rule id and the node targets. Best-practice rules are not enabled:
   the spec gate is WCAG A/AA, and best-practice rules (for example
   `region`) would flag intentional patterns such as portalled toasts.
   Before auditing, the helper waits for network idle and for every finite
   animation to finish, so colors are measured in their settled state rather
   than mid-transition (a button fading back from its disabled opacity);
   infinite animations such as spinners are not awaited.
   *Alternative:* run axe in Vitest through `jest-axe`. Rejected because
   jsdom has no layout or computed color, so contrast and focus checks would
   be missing.

2. **A separate `accessibility.e2e.ts` with its own API mock.** The suite
   mocks the session, content models (one page, one collection with a list
   field and a model field), entries, entry list, media list, preview, and
   detail, users, settings status, and build tokens, all with realistic
   display names so screens render populated states. Each test audits
   after waiting for the route's heading and data. The keyboard walkthrough
   and narrow-screen checks live in the same file because they use the same
   mock. *Alternative:* extend `editor.e2e.ts`. Rejected because its mocks are
   tuned per test and a route-wide fixture would bloat it.

3. **Config runs every non-acceptance suite.** `testMatch` becomes
   `acceptance.e2e.ts` in acceptance mode and `*.e2e.ts` otherwise, with
   `testIgnore` excluding the acceptance file from the default run.

4. **Keyboard walkthrough through a `tabTo` helper.** The test presses Tab
   (bounded, for example 60 presses) until the target locator is focused, and
   fails if it is never reached. This proves reachability in tab order instead
   of calling `focus()`. At every stop it checks that the focused element's
   computed outline or box-shadow is not `none`. Sign-in is mocked with
   a `POST /api/auth/sign-in/email` response that flips the mocked session.

5. **Narrow checks compare geometry and focus order.** At 375×740 each route
   asserts `scrollWidth <= 375`. The editor check asserts that the
   Publication region's top is at or below the last block card's bottom and
   that tabbing from the last block control reaches the publication and
   field controls before leaving the main landmark.

6. **Extend the existing lint script instead of adding a new one.** The rule
   joins `check-admin-colors.mjs` because it scans the same literals and has
   the same exemptions. Violations get a distinct message
   (`arbitrary theme value "text-[0.8rem]"`) and the command's footer names
   both rules. Patterns, applied to string literals only and to optional
   variant prefixes:
   - font size: `text-[` followed by a number;
   - radius: `rounded(-side)?-[…]` except `inherit` and `var(`;
   - shadow: `shadow-[…]`, `inset-shadow-[…]`, `drop-shadow-[…]` except `var(`;
   - focus width: `ring-[`, `ring-offset-[`, `outline-[`,
     `outline-offset-[` followed by a number;
   - motion: `duration-[`, `delay-[`, `ease-[` except `var(`.
   *Alternative:* a Tailwind plugin that disables arbitrary values. Rejected
   because Tailwind v4 has no per-utility switch and layout arbitrary values
   are legitimate.

7. **Fix existing bypasses with the nearest token.** Calendar weekday and
   week-number labels move from `text-[0.8rem]` to `text-xs`, and its focus
   rings from `ring-[3px]` to `ring-2`, matching `--focus-ring-width`. The
   save-shortcut hint moves from `text-[0.625rem]` to `text-xs`. The tooltip
   arrow moves from `rounded-[2px]` to `rounded-xs`, a new
   `--radius-xs: calc(var(--radius) - 6px)` token.

8. **Acceptance walkthrough gains audits, not a new flow.** The existing
   15C script calls the shared helper after each screen has loaded real
   data. Accessibility problems found by any audit are fixed in the owning
   component, not excluded.

## Risks / Trade-offs

- [axe rules change between versions] → The version is pinned in the
  catalog, and failures report the rule id for triage.
- [Third-party markup (Radix portals, sonner, dnd-kit live regions)
  triggers a violation Lace cannot fix] → Exclude only that selector for that
  rule in the helper, with a comment giving the reason, as the spec allows.
  No such exclusion is expected up front.
- [Tab-count bounds make the walkthrough brittle if navigation grows] → The
  bound is generous and the failure names the target that was not reached.
- [Acceptance audits need Docker] → The mocked suite is the gate that
  always runs. The acceptance run is repeated in this session and stays
  in the documented manual/automated walkthrough.
