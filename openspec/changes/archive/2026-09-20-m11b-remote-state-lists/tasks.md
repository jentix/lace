## 1. Credentialed remote-state boundary

- [x] 1.1 Add the schema-validating same-origin admin client, normalized error type, request-ID technical detail, and query-key helpers; verify focused unit tests cover validated payloads, malformed payloads, mapped API errors, and credentials.
- [x] 1.2 Extend the browser session boundary for sign-in, sign-out, invalidation, and safe expired-session recovery; verify focused tests cover successful return routing, sign-out cache clearing, and protected-state removal on session expiry.

## 2. Model-driven content routes

- [x] 2.1 Replace the content landing placeholder with remote model navigation that resolves page singletons and links collections; verify component tests cover page and collection links plus loading and error states.
- [x] 2.2 Implement cursor-paginated collection-entry lists with explicit loading, empty, error, and populated states; verify component tests preserve opaque cursors and exercise the keyboard-reachable next-page action.

## 3. Permission-aware entry mutations

- [x] 3.1 Add the accessible create-entry dialog for permitted collection roles using the minimum valid draft request; verify component tests cover submission, API failure, and post-success list invalidation.
- [x] 3.2 Add keyboard-accessible confirmed deletion for permitted collection roles; verify component tests cover viewer-hidden controls, confirmation, API failure, and post-success list invalidation.

## 4. Integration and quality checks

- [x] 4.1 Update admin route tests for authenticated remote navigation, sign-in/sign-out, expiry recovery, role affordances, and model/list mutation flows; verify `pnpm --filter @lacecms/app-admin test` passes.
- [x] 4.2 Run the required repository checks (`pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm exec openspec validate m11b-remote-state-lists --type change --strict`) and resolve all failures.
