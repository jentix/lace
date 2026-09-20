## Why

Step 10 begins the static-site boundary: Astro and other build-time consumers
need a small, validated client for published Lace content rather than direct
access to server internals or an admin session. The existing public HTTP routes
and shared DTO schemas provide the server-side contract but no consumer SDK.

## What Changes

- Add the Step 10A public SDK for the published-content API, including page,
  collection, path, build-export, and public-media helpers.
- Define normalized base-URL handling, injected or global `fetch`, build-token
  scoping, timeout/abort behavior, a stable user agent, typed HTTP/contract
  errors, and response validation at the client boundary.
- Add conditional build-export retrieval that reports an unchanged `304`
  response without trying to parse a body, while validating all successful
  payloads against the shared REST schemas.
- Add mocked-fetch coverage for public error status mapping, aborts, cursors,
  conditional exports, authorization scoping, and normalized base paths.

## Capabilities

### New Capabilities

- `public-sdk`: A build-time client that consumes only validated published Lace
  REST contracts and exposes safe public-content and public-media operations.

### Modified Capabilities

- `rest-contracts`: Clarify the public build-export conditional-response
  contract that the SDK consumes, including its entity-tagged `304` result.

## Impact

- Affects `packages/sdk`, its package dependencies and tests, and the shared
  `rest-contracts` capability specification.
- Consumes existing anonymous public-content/media routes and the build-token
  protected `/api/v1/public/build-export` route from the Hono application;
  it does not add admin-session, draft, mutation, Astro-rendering, or
  deployment behavior (those remain outside Session 10A).
- Implements roadmap Step 10, Session 10A, consistent with architecture
  sections 4.2, 4.7, 6, and 10.2.
