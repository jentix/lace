## 1. Roadmap and entry scope

- [x] 1.1 Add Step 21.5 and its single Session 21.5A to `docs/mvp-implementation-roadmap.md` between Steps 21 and 22, with site-only scope and acceptance matching this change; verify its session boundary and no Step 22 or 23 requirements move.
- [x] 1.2 Pass the published `SiteEntry` from all four Astro routes into `BaseLayout.astro`, add `data-lace-model` and `data-lace-entry` to its one `<main>`, and extend the fixture-build test to verify one correct entry scope on each output route and no draft-only scope.

## 2. Block and part selectors

- [x] 2.1 Add `data-lace-block` and `data-lace-block-key` to the semantic root of all five built-in block components without changing dispatch or existing classes; verify fixture-build assertions find one root per fixture block in the exported order and the unsupported-type failure still identifies model, entry, and key.
- [x] 2.2 Add the exact `data-lace-part` vocabulary from the delta spec to existing semantic elements and neutral wrappers for the three rich-text fragments; verify fixture-build assertions cover populated parts, absent optional parts on the `about` hero, and existing rich-text safety checks.

## 3. Site-owned styling and documentation

- [x] 3.1 Add a site-owned global stylesheet entry and import it through `BaseLayout.astro`; verify the fixture build emits its CSS and a documented `data-lace-*` example selector affects the intended static output without renderer or CMS changes.
- [x] 3.2 Write `docs/site-styling.md` with the selector table, scoped examples for type/model/entry/instance, the entry-plus-block-key uniqueness rule, Astro global-CSS guidance, optional-part behavior, and compatibility boundary; link it from `docs/node-api.md` and verify each documented selector appears in the built fixture HTML.

## 4. Change acceptance

- [x] 4.1 Run the focused `@lacecms/app-site` tests and build, then root `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm exec openspec validate public-site-styling-hooks --type change --strict`; verify all pass and inspect the final diff for source-only site changes with no content, API, or database migration.
