## 1. Reproduction and repair

- [x] 1.1 Add an integration test that reproduces localhost sign-in rejection with the generated 127.0.0.1 origin and verifies foreign origins remain rejected; verify it fails before the fix.
- [x] 1.2 Trust only the alternate loopback hostname on the same scheme and port in non-production, and document local hostname behavior; verify both local sign-in and production rejection tests pass.

## 2. Verification

- [x] 2.1 Run focused auth/Node tests, root typecheck, Oxlint, Oxfmt check, and strict OpenSpec validation; verify all pass.
