## 1. Builder contract

- [x] 1.1 Implement authenticated closed-shape HTTP trigger and verify invalid auth, keys, body, and concurrent requests in builder tests.
- [x] 1.2 Implement fixed source copy, frozen install, Astro build, and version guard; verify success and failure with a local fake toolchain test.

## 2. Release and dispatch

- [x] 2.1 Implement atomic release switch and fixed retention; verify successful and failed builds preserve the expected current and previous releases.
- [x] 2.2 Implement conditional lease renewal for long synchronous triggers and verify ownership and expiry behavior in repository and dispatcher tests.
- [x] 2.3 Implement the Node builder trigger and runtime wiring; verify the adapter maps success, failure, and unavailable/malformed responses to sanitized outcomes.

## 3. Packaging and verification

- [x] 3.1 Add a pinned builder image and private deployment contract documentation; verify image commands and mount paths are fixed in reviewed files.
- [x] 3.2 Run focused tests, root typecheck, lint, format check, and strict change validation; fix any failures.
