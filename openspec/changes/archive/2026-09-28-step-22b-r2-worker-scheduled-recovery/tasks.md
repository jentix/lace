## 1. Shared runtime-neutral pieces

- [x] 1.1 Move the site-build and media-deletion dispatchers into `@lacecms/application` (`SiteBuildDispatcher`, `MediaDeletionDispatcher`) with an optional timer `unref`, and re-export them from `@lacecms/platform-node` under the existing `Node*` names; verify the existing platform-node dispatcher tests pass unchanged.
- [x] 1.2 Add `securityContractCases` to `@lacecms/test-utils` covering setup minting, bootstrap claim/resume/foreign-email refusal/completion, final-admin protection (sequential and concurrent), user creation/role change, build-token issue/verify/revoke with digest-only storage, and fixed-window limits with HMAC keys; run it against Node SQLite in `platform-node` and verify it passes.

## 2. Cloudflare adapters

- [x] 2.1 Implement `CloudflareR2ObjectStorage` over a structural R2 binding with size limit, missing-versus-empty reads, idempotent delete, bounded timeout, sanitized failures, and the Node public-media URL shape; verify with Miniflare R2 tests including a failing and a hanging binding.
- [x] 2.2 Implement `WorkerImageInspector` for PNG, JPEG, WebP, and AVIF container walks with orientation handling and trailing-data rejection; verify with sharp-generated fixtures that its results equal `NodeSharpImageInspector` and that malformed, mismatched, truncated, and trailing inputs fail with `CONTENT_INVALID_STATE`.
- [x] 2.3 Implement `D1SecurityService` and `D1FixedWindowRateLimiter` with Web Crypto and guarded single statements/batches; verify the shared security contract suite and a concurrent rate-limit case pass against local D1.
- [x] 2.4 Implement `CloudflareKvCache` and `NoopCloudflareCache`; verify KV round-trip, delete, and that malformed values and failing bindings are misses.

## 3. Worker composition

- [x] 3.1 Implement `parseCloudflareSettings` for D1, R2, KV, ASSETS, `LACE_AUTH_SECRET`, `LACE_PUBLIC_BASE_URL`, `LACE_DEPLOY_HOOK_URL`, `LACE_ENVIRONMENT`, and `LACE_R2_TIMEOUT_MS`; verify that invalid inputs are reported by name without echoing values.
- [x] 3.2 Implement the ASSETS-backed admin responder (redirect, SPA fallback, 404, 405, nosniff); verify with a fake assets fetcher.
- [x] 3.3 Implement `createCloudflareWorker({ config })` composing content, media, builds, security, rate limiting (`cf-connecting-ip`), Better Auth on `drizzle-orm/d1`, readiness, and per-isolate memoization, with a sanitized `503` for invalid settings; verify a Miniflare-bound test that bootstraps an admin, signs in, uploads media to R2, creates and publishes an entry, reads it publicly, and gets the API `404` for an unknown `/api` path.
- [x] 3.4 Implement the `scheduled` handler and the post-commit `waitUntil` pass; verify that scheduled dispatch processes a debounced build and pending media deletions, that one failing dispatcher does not block the other, that `waitUntil` is registered only after successful dispatch-producing requests, and that a scheduled invocation stays within 50 D1 queries with many pending deletions.

## 4. Worker entry, configuration, and bundle

- [x] 4.1 Add `apps/api/worker/index.ts` (static `lace.config.ts` import), its worker tsconfig and typecheck script, and `apps/api/wrangler.jsonc` with D1/R2 bindings, `nodejs_compat`, ASSETS with `run_worker_first`, and a minute cron; verify `pnpm --filter @lacecms/app-api typecheck` passes.
- [x] 4.2 Add the bundle test that runs a Wrangler dry-run, asserts the compatibility flag, rejects `better-sqlite3`, `@aws-sdk`, `sharp`, and `node:fs` in the output, and serves health and an auth route from the bundle in Miniflare; verify it passes.

## 5. Documentation and verification

- [x] 5.1 Document the Worker bindings, secrets, cron, and recovery model in `docs/cloudflare-worker.md` and note 22B completion in the roadmap; verify the links resolve.
- [x] 5.2 Run focused package tests, root `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm exec openspec validate step-22b-r2-worker-scheduled-recovery --type change --strict`; verify all pass.
