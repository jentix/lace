## 1. Portable publication contract

- [x] 1.1 Extend the portable guarded publication command and result values with actor-scoped idempotency key/fingerprint input and fresh-versus-replay outcome; verify `@lacecms/application` type and unit tests cover contract construction without REST, database, or runtime imports.
- [x] 1.2 Extend `InMemoryContentStore` to atomically retain successful publication idempotency records, return a detached replay result for an identical request, and reject a mismatched reuse without changing the entry, route, or public version; verify focused fake tests cover retry, mismatch, and route/revision rollback behavior.

## 2. Content-use-case service

- [x] 2.1 Add transport-neutral actor-scoped create, list, load aggregate/draft/published, and delete use cases over the existing read/command ports; enforce the specified read/write/publish permissions and verify focused tests prove viewer reads succeed, denied mutations do not invoke commands, and public deletion needs publish permission.
- [x] 2.2 Add complete-draft normalization and validation for create/save/publish using the normalized model and runtime block registry; enforce ordered positions and resolve every present model/block media reference to active metadata before a write; verify focused tests cover defaults, invalid fields/blocks/order/byte limits, missing/inactive media, strict publish fields, and unchanged data after rejected validation.
- [x] 2.3 Add save and publish use cases that use expected revisions, generated IDs and clock time, resolve publish routes before the guarded command, and return detached portable results; verify the in-memory vertical slice creates a page, saves blocks, publishes, edits the draft, and retains the former published snapshot.
- [x] 2.4 Add independent build-dispatch outcomes to fresh publication results and suppress dispatch for idempotent replays; verify accepted, rejected, and thrown trigger outcomes leave successful public content intact and retry does not trigger a second build.

## 3. Verification and change integrity

- [x] 3.1 Add/adjust `@lacecms/application` and `@lacecms/test-utils` tests for permission denial, singleton races, revision and route conflicts, idempotency reuse, aggregate/media validation, and draft/public isolation; verify their narrow build, test, lint, and typecheck scripts pass.
- [x] 3.2 Run the dependency-boundary checker, root `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm exec openspec validate m04c-content-use-cases --type change --strict`; resolve all reported failures before marking the change complete.
