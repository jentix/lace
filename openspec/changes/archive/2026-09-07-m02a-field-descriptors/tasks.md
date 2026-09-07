## 1. Portable descriptor foundation

- [x] 1.1 Replace the content-package skeleton export with documented public JSON-value, field-kind, common-option, per-kind definition, and field-value inference types; verify `pnpm --filter @lacecms/content typecheck` accepts the public entry point without Node ambient APIs.
- [x] 1.2 Implement a recursive detached JSON normalizer and immutable definition construction that rejects executable, symbolic, cyclic, non-finite, sparse, and host-object option graphs with option-path diagnostics; verify focused runtime tests cover accepted copies and every rejection class.

## 2. Field builders and metadata

- [x] 2.1 Implement typed `field.text`, `textarea`, `richText`, `number`, `boolean`, `date`, `datetime`, `select`, `url`, and `media` builders with common options, string/numeric/select constraints, and default compatibility checks; verify runtime table tests cover every variant, valid constrained defaults, and all malformed or contradictory configuration paths.
- [x] 2.2 Implement the serializable form-metadata projection from normalized definitions without callbacks or runtime schema objects; verify metadata round-trips through JSON and remains detached from caller-supplied options.

## 3. Type contract and session verification

- [x] 3.1 Add compile-time tests for every field value type, inferred required/default behavior, and literal select unions; verify the package type-test command fails for intentional invalid assertions and passes for the committed suite.
- [x] 3.2 Run the content-package build, typecheck, lint, and test commands, then the root `format:check`, `lint`, `typecheck`, `test`, `build`, and strict OpenSpec validation; verify all passing checks succeed and no Session 2B behavior is implemented.
