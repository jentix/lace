## 1. Clean-workspace typecheck repair

- [x] 1.1 Add the upstream workspace build dependency to Turborepo's `typecheck` task and verify `@lacecms/config` resolves `@lacecms/content` from a clean generated-output state.
- [x] 1.2 Run root typecheck, lint, format check, tests, and strict OpenSpec validation; verify the Typecheck task graph builds `@lacecms/content` before checking `@lacecms/config`.
