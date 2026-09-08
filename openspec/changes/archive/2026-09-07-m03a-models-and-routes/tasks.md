## 1. Typed model definitions

- [x] 1.1 Add the public `@lacecms/content` dependency and model-definition types to `@lacecms/config`; implement deeply detached page and collection builders with inferred field shapes, stable identity/version checks, temporary rename metadata, and declarative block keys, verified by package type tests and malformed-input unit tests.
- [x] 1.2 Implement configuration assembly and cross-model identity checks, including duplicate current/former keys, duplicate page paths, duplicate collection patterns, and configuration-detectable page/collection collisions; verify each rejection and a valid mixed configuration in unit tests.

## 2. Canonical routes and hashes

- [x] 2.1 Implement canonical page-path and collection-pattern validation plus safe collection-route resolution; verify valid root/fixed/slug routes and all rejected query, fragment, dot-segment, slash, parameter, and unsafe-slug cases in unit tests.
- [x] 2.2 Generate detached deeply readonly semantic and complete projections with per-model and whole-config canonical SHA-256 hashes; verify insertion-order stability, display-only hash behavior, structural-change behavior, and source-input detachment in unit tests.

## 3. Public API and quality gates

- [x] 3.1 Document the asynchronous normalized-config entry point and its portable hashing rationale in the package API, and verify a top-level-await configuration fixture typechecks.
- [x] 3.2 Run focused config tests and type tests, then root typecheck, Oxlint, Oxfmt check, and `pnpm exec openspec validate m03a-models-and-routes --type change --strict`; resolve every failure before marking the change complete.
