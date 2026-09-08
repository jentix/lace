## 1. Block DSL and registry

- [x] 1.1 Add the portable `@lacecms/content` block-definition, metadata, runtime-validation, and registry public APIs, including stable type/version/default checks and deep detachment; verify focused unit and compile-time inference tests cover valid and malformed definitions.
- [x] 1.2 Define `hero`, `richText`, `image`, `quote`, and `cta` with the public block and field DSL and reject duplicate type/version registrations; verify each built-in's exact metadata/default validation and duplicate failure in unit tests.

## 2. Configuration and aggregate validation

- [x] 2.1 Extend `@lacecms/config` root normalization to accept the block registry, reject model block types missing from it, and produce detached runtime and JSON public/admin projections with deterministic hashes; verify runtime validators are absent from the JSON projection and display/structural hash scenarios pass.
- [x] 2.2 Replace generic block payload validation with complete model-and-registry-aware aggregate validation for ordered unique block keys, allowed types, exact schema versions, defaults, draft/publish modes, and existing size limits; verify successful and path-specific negative cases in focused content tests.

## 3. Fixture and quality gates

- [x] 3.1 Update the root configuration fixture to match the architecture's home/posts and five-built-in-block example, and snapshot its canonical serialized public projection; verify the Node fixture and Worker-compatible portable hashing fixture produce the committed result.
- [x] 3.2 Run focused content/config unit and type tests, then root `typecheck`, Oxlint, Oxfmt check, and `pnpm exec openspec validate m03b-block-registry-projections --type change --strict`; resolve every failure before marking the change complete.
