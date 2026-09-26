## Context

See `proposal.md` for motivation and the two delta specs for the acceptance contract. `pnpm dev:node` starts the complete local stack and `pnpm dev:smoke` proves service reachability in a temporary Compose project, but it does not exercise authenticated product flows. `apps/admin/src/editor.e2e.ts` uses intercepted API responses, while the README and `docs/node-api.md` describe a manual live-site flow that still calls token creation from the browser console. The included `home` and `about` pages and `notes` collection already have Astro routes.

## Goals / Non-Goals

**Goals:**

- Make the acceptance walkthrough runnable without modifying a fixture or invoking a content API manually.
- Combine a real-stack editorial walkthrough with focused deterministic browser and API checks so both integration and failure states are covered.
- Record a clear pass/fail result and any concrete product-flow defects found during the pass.

**Non-Goals:**

- Add outbox dispatch, build history/retry, a production builder, or deployment packaging.
- Expand the accepted editor, media, authentication, or content model behavior to cover unrelated feature ideas.
- Make a browser test depend on an existing contributor's persistent local database or secrets.

## Decisions

### 1. Use an isolated local stack for the acceptance walkthrough

Extend the existing development stack orchestration, or add a thin script beside it, to create a uniquely named Compose project, temporary local environment, and its own persistent volumes. Run committed migrations and explicit `content:sync` there, then leave the stack available for the documented browser walkthrough until a named cleanup action removes only that project's resources. A unique port avoids collision with `dev:node`. Reuse the same service images and health checks as `dev:smoke`; do not add a second deployment topology. This favors real integration evidence over expanding the mocked editor test into an artificial end-to-end simulation. Ordinary `lace-dev` data is never reset.

### 2. Split full-flow proof from deterministic edge-state checks

The real-stack walkthrough uses Admin for first sign-in, page and collection editing, media upload/reuse, publication, and Settings token issuance; it checks the published site after live-mode restart and checks a later draft against the prior public route. Focused Playwright tests in `apps/admin` cover UI states that are difficult to produce reliably in a fresh stack: network failure, empty lists, revision conflict, role-specific navigation, keyboard focus, and narrow viewport. Existing server authorization tests or new focused API tests verify the same denied operations independently of hidden UI controls. Keep browser tests at the Admin boundary and server tests at the Hono boundary; no production package imports a test harness.

### 3. Treat acceptance findings as bounded fixes

Record each observed failure with a reproduction step and expected accepted-spec behavior, then fix it in the owning package and add the narrowest useful regression check. If a finding requires changing observable behavior, revise the active OpenSpec artifacts before implementation. A defect in Step 16 build history remains outside this change; Builds must accurately explain its current operational state. Update README and `docs/node-api.md` so the operator path follows Settings and shows the exact site refresh, token handling, and cleanup steps.

## Risks / Trade-offs

- [Docker or browser runtime unavailable on a contributor machine] → Keep the walkthrough explicit and report which live checks could not run; focused tests still cover deterministic behavior, but do not claim full acceptance without a real-stack pass.
- [Transient test data leaks into normal development] → Use a unique Compose project, port, environment file, and volumes; cleanup targets only that identity and is an explicit action.
- [Live Astro process caches the published export] → Verify the documented stop/start refresh and both old and new routes instead of assuming browser reload triggers a rebuild.
- [Role and conflict checks become brittle when driven solely through one browser session] → Use focused browser states plus direct server authorization tests, and reserve the real stack for the editorial happy path and draft isolation.

## Migration Plan

No database migration or public API change is planned. Add the acceptance command and documentation, run it on an isolated project, and retain the existing `dev:node` workflow. Rollback removes the acceptance tooling and guide changes without touching ordinary local data.
