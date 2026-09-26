## 1. Isolated acceptance environment

- [x] 1.1 Add a named acceptance start/stop path using a unique Compose project, port, environment, and volumes based on `scripts/dev-stack.mjs`; verify an acceptance run reaches API, Admin, Astro, and MinIO and leaves an existing `lace-dev` project untouched.
- [x] 1.2 Make the acceptance start path apply committed migrations and run explicit configuration synchronization, then verify the configured pages have drafts and collections start empty without a fixture edit.

## 2. Browser and server acceptance coverage

- [x] 2.1 Add a real-stack editorial acceptance check or recorded walkthrough for page editing, collection creation, media upload/reuse, publication, Settings token issuance, and live Astro output; verify the published page and collection routes display the expected content.
- [x] 2.2 Verify a later saved draft title and slug stay out of published export and the refreshed Astro site until republished; add the narrowest regression test for any observed failure.
- [x] 2.3 Add focused browser checks for admin/editor/viewer affordances and direct API authorization checks for denied publish, user/token, content, and media mutations; verify both test suites pass.
- [x] 2.4 Add focused browser checks for stale-revision recovery, responsive keyboard navigation and focus, and loading/empty/error states on Content, Media, Users, and Settings; verify Builds accurately shows its pre-Step-16 state and the browser suite passes.

## 3. Guidance, defects, and completion

- [x] 3.1 Update README and `docs/node-api.md` with the exact isolated walkthrough, Admin Settings token flow, live-site refresh, expected results, and acceptance-only cleanup; verify a contributor can follow the instructions without a fixture or browser-console API call.
- [x] 3.2 Resolve every concrete in-scope product-flow defect found by the acceptance pass in its owning package, adding a focused regression check and revising the active OpenSpec artifacts first if accepted behavior must change; verify the failing reproduction now passes.
- [x] 3.3 Run the narrowest relevant tests, root typecheck, Oxlint, Oxfmt check, and `pnpm exec openspec validate m15c-local-product-acceptance --type change --strict`; verify the real-stack walkthrough passes and record any unavailable check accurately.
