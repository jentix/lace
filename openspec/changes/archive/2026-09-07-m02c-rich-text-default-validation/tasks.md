## 1. Rich-text default contract reconciliation

- [x] 1.1 Verify that rich-text field normalization applies the shared safe-document contract to a supplied default, and adjust it only if needed; verify a safe document is retained as detached portable JSON.
- [x] 1.2 Add focused field-descriptor regression tests that reject malformed, disallowed, and unsafe-link rich-text defaults; verify `pnpm --filter @lacecms/content test` and `pnpm --filter @lacecms/content type-test` pass.

## 2. Change verification

- [x] 2.1 Run the content-package build, typecheck, and lint, then root `format:check`, `lint`, `typecheck`, `test`, and `build`; verify all commands pass without new dependencies or public API changes.
- [x] 2.2 Run `pnpm exec openspec validate m02c-rich-text-default-validation --type change --strict`; verify the delta fully preserves the modified field-descriptor requirement and all tasks are complete before archive.
