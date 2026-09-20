## Context

`packages/sdk` currently contains only package identity. The server already
serves validated published page, collection, by-slug, by-path, media, and
entity-tagged build-export routes, while `@lacecms/contracts` owns their DTO
schemas. The SDK must stay on the public side of the package graph: it can
depend on contracts but not on server, application, database, or authentication
implementation packages.

## Goals / Non-Goals

**Goals:**

- Create a portable fetch client whose return values are inferred from shared
  runtime schemas.
- Make request construction deterministic for an API mounted at an origin or
  under a path prefix.
- Give build systems actionable transport, HTTP, and contract failures without
  relying on unchecked `response.json()` values.
- Let callers use an ETag to avoid reparsing an unchanged build export.

**Non-Goals:**

- No Astro routes, rendering, fixture, cache persistence, retries, or static
  build orchestration (Session 10B and later work).
- No administrative requests, authenticated browser-session support, content
  mutations, or broad authorization client.
- No change to public API route shapes or server persistence behavior.

## Decisions

### Expose a small capability-specific client surface

`createLaceClient(options)` will return `getPage`, `getCollection`,
`getAllCollection`, `getCollectionBySlug`, `getByPath`, `getBuildExport`, and
`getPublicMediaUrl`. Collection methods will accept an explicit pagination
input, while `getAllCollection` alone loops by passing each opaque
`nextCursor` as `after`.

This keeps the one-request default predictable for ordinary callers and makes
potentially unbounded work conspicuous in Astro build code. A generic URL
request method is rejected because it would weaken the published-only API
boundary and make build-token scoping error-prone.

### Build URLs from a parsed base URL and encoded segments

Client construction will parse and normalize a required HTTP(S) base URL once,
retaining its pathname prefix and one trailing slash. Resource paths will be
appended as encoded URL segments; query values will use `URLSearchParams`.
`getPublicMediaUrl` will reuse that construction but remain non-networking.

String concatenation is rejected because it commonly loses a prefix, produces
double slashes, or permits an identifier to change URL structure.

### Centralize fetch lifecycle and schema parsing

A private request path will resolve injected fetch or `globalThis.fetch`, merge
the caller signal with a configured timeout signal, add the stable SDK user
agent when accepted by the runtime, and clean up timeout resources after every
settlement. Successful JSON data is parsed with the appropriate Valibot schema.
Non-success bodies first attempt the shared error-envelope schema: a valid
envelope becomes `LaceHttpError`; malformed/invalid JSON and invalid successful
DTOs become `LaceContractError`; cancellation and other fetch failures become
`LaceTransportError` with the original cause.

This design deliberately does not retry: build systems choose their own retry
and deployment policy, and silent retries would obscure publish/build failures.

### Restrict the build token and model conditional exports explicitly

Only `getBuildExport` adds `Authorization: Bearer <token>`. It will accept an
optional prior ETag, validate its form before dispatch, set `If-None-Match`, and
return a discriminated result: `{ changed: false, etag }` for `304`, or
`{ changed: true, etag, export: BuildExportDto }` for a validated `200`.

Returning `undefined` for `304` is rejected because it loses the response ETag
and forces callers to infer an ambiguous result. Passing the build token through
all public requests is rejected because it violates least privilege and makes
token leaks more likely in logs or third-party fetch instrumentation.

## Risks / Trade-offs

- [Some browser runtimes forbid or ignore `User-Agent`] → attempt the stable
  header in the portable request setup and keep the SDK's intended Astro/Node
  build use independent of browser-only behavior.
- [A collection may be large or change while all pages are read] → only the
  explicitly named all-items operation loops; it preserves server-issued cursor
  order and exposes normal request failures.
- [Abort APIs differ across target runtimes] → compose signals with the
  platform's standard primitives where available and cover timeout and
  caller-triggered cancellation with mocked fetch tests.
- [A proxy can return HTML or a non-Lace error body] → classify it as a
  contract failure, avoiding unsafe assumptions about payload shape.

## Migration Plan

1. Add `@lacecms/contracts` as the SDK's workspace dependency and implement the
   client, errors, types, and tests in `packages/sdk`.
2. Validate the existing conditional build-export behavior in the accepted
   contract spec; no database or server migration is required.
3. Consumers can adopt the client incrementally because the package has no
   existing public operations beyond its identity export. Reverting this change
   removes the SDK surface without changing server data or routes.
