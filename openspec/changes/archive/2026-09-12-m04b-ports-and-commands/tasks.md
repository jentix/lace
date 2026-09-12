## 1. Portable application contracts

- [x] 1.1 Add the required portable `@lacecms/application` workspace dependencies and export application-owned identifiers, opaque cursor/page values, model-sync inputs/results, complete-draft/public/build projection values, and stable command results; verify the application build and typecheck compile without transport, database, framework, Node, or Cloudflare imports.
- [x] 1.2 Define focused read and specialized atomic mutation ports for model synchronization, entry create/load/list/save/publish/delete, public listing, and build export, including all guard/result types and no generic transaction callback; verify focused contract tests exercise portable reads, opaque cursors, and each atomic command shape.
- [x] 1.3 Define portable `ObjectStorage`, derived `Cache`, `SiteBuildTrigger`, `Clock`, `IdGenerator`, password-safe opaque-token verifier, and dispatcher lease ports; verify type and unit tests cover cache-independent reads, verifier-only persistence values, and lease claim/completion semantics.

## 2. In-memory reference doubles

- [x] 2.1 Add deterministic clock and ID fakes plus in-memory object storage, cache, site-build trigger, token verifier, and dispatcher lease fakes in `@lacecms/test-utils`; verify focused tests cover deterministic values, storage isolation, cache misses, verifier rejection, trigger results, and exclusive bounded leases.
- [x] 2.2 Add an in-memory content/model-sync fake implementing the application ports with private indexes and detached results; verify tests cover model-sync inspection/application, complete draft loading/saving, opaque cursor traversal, public data listing, and build export.
- [x] 2.3 Enforce page singleton, expected revision, published-route ownership, atomic failure, and immutable detached-publication invariants in the content fake; verify tests cover competing page creation, stale save/publication, route-conflict rollback, and published data remaining unchanged after a later draft edit.

## 3. Verification and change integrity

- [x] 3.1 Run focused `@lacecms/application` and `@lacecms/test-utils` builds, tests, and typechecks, plus the dependency-boundary checker; resolve all failures and verify permitted package edges introduce no prohibited runtime or transport imports.
- [x] 3.2 Run `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm exec openspec validate m04b-ports-and-commands --type change --strict`; resolve every failure before marking the change complete.
