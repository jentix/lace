## 1. Astro build input and package setup

- [x] 1.1 Expand both starter models to allow all five built-in blocks and
  increment their versions; add Astro and the SDK workspace dependency, static
  build/typecheck/test scripts, and documented fixture/live environment
  configuration in `apps/site`; verify focused configuration tests and
  `pnpm --filter @lacecms/app-site typecheck` succeed.
- [x] 1.2 Implement the cached, DTO-validated fixture/live build-export loader
  and starter home/posts route derivation; verify focused tests prove fixture
  mode makes no request and live mode performs exactly one authenticated export
  request.

## 2. Static routes and safe rendering

- [x] 2.1 Implement the home and generated blog Astro routes using only the
  shared derived export data; verify the fixture build emits `/` and every
  expected `/blog/:slug` route without CMS access.
- [x] 2.2 Implement ordered renderers for `hero`, `richText`, `image`, `quote`,
  and `cta`, including base-path-preserving public media URLs and contextual
  build failures for unknown/malformed blocks; verify focused renderer tests
  cover all built-ins and the model/entry/block failure identity.
- [x] 2.3 Implement the structural safe-Tiptap renderer without raw HTML;
  verify focused tests cover every supported node/mark and prove hostile
  node/mark/attribute/link inputs cannot become executable output.

## 3. Fixture and end-to-end verification

- [x] 3.1 Add a committed published build-export fixture aligned with the
  starter configuration, including all built-ins, stable media, and safe rich
  text; verify it parses with the shared build-export DTO schema.
- [x] 3.2 Add an Astro fixture-build/output test with an unreachable CMS URL;
  verify expected routes and published output exist, while draft-only and
  unsafe marker values are absent and the media URL retains its API base path.
- [x] 3.3 Run the focused site tests, `pnpm --filter @lacecms/app-site build`,
  root `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and
  `pnpm exec openspec validate m10b-astro-fixture --type change --strict`;
  resolve all failures before marking the change complete.
