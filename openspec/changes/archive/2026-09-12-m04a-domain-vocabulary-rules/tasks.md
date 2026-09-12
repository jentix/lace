## 1. Portable vocabulary and authorization

- [x] 1.1 Add the public `@lacecms/content` workspace dependency and implement the `@lacecms/domain` branded IDs/keys, readonly content aggregates, blocks, media metadata, build/publication state, actor, role, permission, and finite domain-error contracts; verify the package build and a domain type-test compile without transport, database, authentication, or runtime imports.
- [x] 1.2 Implement the complete readonly default role-to-permission matrix and `requirePermission`; add focused unit tests proving every role's grants and the stable permission-denied error.

## 2. Content rules and lifecycle transitions

- [x] 2.1 Implement pure page-cardinality, canonical page/collection public-path resolution, and cross-entry public-route conflict rules; add unit tests for singleton rejection, valid collection routes, unsafe slugs, retained own routes, and conflicting owners.
- [x] 2.2 Implement flat block position validation, sparse insertion calculation, and order-preserving normalization using 1,000-step positive safe integers; add unit tests for valid gaps, exhausted adjacent positions, invalid/duplicate positions, and normalized order.
- [x] 2.3 Implement complete draft replacement and publication snapshot transitions with exactly-one revision increments, deep detachment, and published-data immutability; add unit tests proving invalid lifecycle state and immutable-published failures, draft/published isolation, and replacement of the sole current published snapshot.

## 3. Verification and change integrity

- [x] 3.1 Run the focused `@lacecms/domain` build, unit tests, and type tests; verify the package-boundary checker accepts the domain-to-content dependency and rejects no prohibited imports.
- [x] 3.2 Run `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm exec openspec validate m04a-domain-vocabulary-rules --type change --strict`; resolve every failure before marking the change complete.
