## 1. Status and browser transport

- [x] 1.1 Add the validated admin settings status contract and authorized server route; verify server tests cover admin and non-admin responses.
- [x] 1.2 Extend the credentialed admin client with validated user, token, and status operations; verify client tests cover payloads, errors, and once-shown token parsing.

## 2. Admin workflows

- [x] 2.1 Implement Users list, create, role-change, and disable screens; verify UI tests cover role access, successful refresh, and failed last-admin actions.
- [x] 2.2 Implement Settings status and token create/list/revoke screens; verify UI tests cover token dismissal, API failure, and non-admin access.
- [x] 2.3 Redirect `/admin/` through the session guard and expose logout in the main header; verify route and logout tests.

## 3. Final verification

- [x] 3.1 Run focused admin/server tests, root typecheck, Oxlint, Oxfmt check, and strict OpenSpec validation; verify all pass.
