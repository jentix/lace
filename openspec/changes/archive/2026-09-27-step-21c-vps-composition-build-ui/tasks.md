## 1. Durable build reads

- [x] 1.1 Add bounded newest-first build list/detail repository reads and an application read port; verify persisted status, timestamps, provider ID, and sanitized error in repository tests.
- [x] 1.2 Extend shared build DTOs and authenticated versioned GET routes; verify response validation, role access, and 404 behavior in contract/server tests and regenerate OpenAPI.

## 2. Production processes and composition

- [x] 2.1 Add production API, admin asset, and independent dispatcher entrypoints; verify API readiness and a worker recovery test after API termination.
- [x] 2.2 Add production Docker images, Compose networks/volumes/health/dependencies, static reverse proxy, and environment documentation; verify `docker compose config` and image build.

## 3. Build management UI

- [x] 3.1 Add credentialed build reads and commands to the browser client, with response parsing and client tests.
- [x] 3.2 Replace `/builds` placeholder with history, detail, request/retry, and role-aware states using existing UI primitives; verify screen tests for success, failure, empty, restricted, and recovery states.

## 4. Integration and release gate

- [x] 4.1 Add an integration scenario for rapid publications, one normal served release, failed-build retention, and retry; verify the scenario against the production composition.
- [x] 4.2 Run narrow tests, root typecheck, Oxlint, Oxfmt, OpenAPI check, and strict OpenSpec validation; verify all pass and update the operator documentation.
