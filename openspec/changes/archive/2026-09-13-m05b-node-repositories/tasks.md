## 1. Portable persistence contracts

- [x] 1.1 Add a portable, immutable complete-draft media-reference value and include it in the save command; generate it from normalized model/block media fields in the content use case, with focused unit tests proving source keys and field paths are explicit rather than inferred from JSON.
- [x] 1.2 Extend public-read contracts for canonical route resolution and publicly reachable media metadata, then update the in-memory parity double and its tests to preserve draft/public visibility boundaries.

## 2. Node mapping and bounded reads

- [x] 2.1 Implement defensive SQLite row mappers for content aggregates, snapshots, blocks, public routes, and media metadata; verify mapper/repository tests reject corrupt JSON and return portable domain values.
- [x] 2.2 Implement versioned base64url cursor codecs plus capped seek-pagination queries for admin model entries and public collections; verify malformed/wrong-kind cursors, timestamp ties, continuation order, and no duplicate boundaries.
- [x] 2.3 Implement bounded public route lookup, public-media visibility lookup, and set-based build export aggregation; verify draft-only data is hidden and query instrumentation proves multiple entries/blocks do not produce N+1 reads.

## 3. Atomic Node draft writes

- [x] 3.1 Implement a Node create-draft repository transaction that creates the entry, one draft snapshot, ordered blocks, media-reference projection, and draft pointer; verify page-cardinality and foreign-key failures leave no partial aggregate.
- [x] 3.2 Implement the guarded complete-draft transaction that replaces blocks/references and increments revision once; verify stale guards and injected statement failures preserve the old aggregate exactly.
- [x] 3.3 Keep guarded publication and deletion out of the ordinary draft repository API, and verify type/runtime tests expose only the planned read/create/save behavior for this session.
- [x] 3.4 Permit `@lacecms/platform-node` to consume `@lacecms/domain` and `@lacecms/content` through public entry points in the source-level boundary checker; verify the allowed edge passes while cycle and forbidden-edge checks remain enforced.

## 4. Verification and operational documentation

- [x] 4.1 Document that Node repositories require the explicit Session 5A migration before use and that publication/deletion arrive in Session 5C; verify the documentation names the migration command.
- [x] 4.2 Run focused application/platform-node tests, then root `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm exec openspec validate m05b-node-repositories --type change --strict`; resolve every failure before marking this task complete.
