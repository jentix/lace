## 1. SDK package and transport foundation

- [x] 1.1 Add the contracts workspace dependency and exported public SDK types,
  typed errors, option validation, base-path URL construction, and fetch
  resolution; verify `pnpm --filter @lacecms/sdk typecheck` passes.
- [x] 1.2 Implement the shared request lifecycle with stable user-agent,
  timeout/caller-signal composition, error-envelope status mapping, and Valibot
  response validation; verify focused mocked-fetch tests cover valid errors,
  malformed responses, timeouts, and caller aborts.

## 2. Published-content client operations

- [x] 2.1 Implement typed page, paginated collection, collection-by-slug, and
  by-path reads with encoded identifiers and query parameters; verify focused
  tests assert the exact public endpoints and preserve a normalized base path.
- [x] 2.2 Implement the explicitly named all-items collection method and the
  non-networking public-media URL helper; verify tests prove cursor chaining is
  limited to the all-items method and opaque cursors are transmitted unchanged.
- [x] 2.3 Implement authenticated conditional build-export retrieval with typed
  changed/unchanged results; verify tests cover `If-None-Match`, `304` without
  body parsing, replacement ETags, and token scoping to build exports only.

## 3. Contract alignment and verification

- [x] 3.1 Confirm the existing public build-export route satisfies the clarified
  conditional ETag contract and add or adjust focused server/contract tests if
  coverage reveals a gap; verify the relevant package tests pass.
- [x] 3.2 Run the SDK test suite, root `pnpm typecheck`, `pnpm lint`,
  `pnpm format:check`, and `pnpm exec openspec validate m10a-public-sdk --type
  change --strict`; resolve all failures before marking the change complete.
