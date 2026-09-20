## Context

`apps/site` currently exports only its package identity. Session 10A added
`@lacecms/sdk`, whose authenticated `getBuildExport` method validates the
published export and isolates the build token. The starter configuration will
define one `home` page at `/` and a `posts` collection at `/blog/:slug`, with
each model permitting the five renderable built-ins. The accepted block registry
supplies those blocks and content validation defines the safe Tiptap subset.

The reference site must stay on the static, published side of the architecture:
it cannot import a server composition root, database, application use case, or
admin/auth package. See `proposal.md` for motivation and
`astro-reference-site` delta requirements for observable behavior.

## Goals / Non-Goals

**Goals:**

- Make `apps/site` a conventional Astro static build with a fixture-first CI
  input and an authenticated live input.
- Load and validate export data once, index it in memory, and share that cache
  between `getStaticPaths` and page rendering during an Astro build.
- Render starter blocks and rich text through typed, structural Astro
  components without a raw-HTML escape hatch.
- Make fixture builds and their output assertions deterministic.

**Non-Goals:**

- General custom-block rendering, arbitrary content-model routes,
  client-side CMS fetching, previews, or incremental/conditional export cache
  persistence.
- Changes to the public SDK, server routes, config DSL, build dispatcher, or
  deployment configuration beyond the starter models' allowed blocks and
  version increments.
- A rich-text editor or acceptance of input outside the shared validation
  allowlist.

## Decisions

### Use an explicit fixture/live input boundary and a build-scoped cached loader

The site will add a small data module with one cached promise. Fixture mode
reads and validates a committed JSON export; live mode constructs
`createLaceClient` from required API-base-URL and build-token environment
values and calls only `getBuildExport` once. The module derives the home entry
and post list/slug index from that result. Both static-path generation and
route rendering consume the same derived object.

Fixture mode will be the default for reproducible local/CI builds; live mode
will be explicit. Both modes receive a configured base URL for stable public
media URLs, but fixture mode never sends a request. A missing, duplicate, or
unexpected starter model/path/slug will cause a descriptive build error rather
than silently creating partial routes.

Using individual SDK `getPage`/`getCollection` calls is rejected because it
violates the one-export build contract and couples route discovery to network
round trips. Reading unvalidated fixture JSON directly is rejected because it
would bypass the same public DTO boundary used by live builds.

### Keep the fixture aligned with the starter configuration and assert final output

A committed build-export fixture will include the published home entry and
posts exercising all five built-in blocks, a media reference, and a safe rich
text document. It will deliberately contain no draft-only value. The site test
will run an Astro fixture build with an unreachable CMS URL and inspect emitted
HTML/routes: `/`, blog slugs, visible published content, base-path-preserving
media URLs, and absence of draft-only or unsafe payloads.

The fixture is a portable public-export DTO, not a database fixture or a
server-internal snapshot. A separate renderer-level test will provide hostile
rich-text input to prove that it cannot become output; keeping it out of the
valid build export preserves the accepted content-validation contract.

### Dispatch blocks locally and fail closed

The page layer will pass each ordered block to a single local dispatcher with
components for `hero`, `richText`, `image`, `quote`, and `cta`. Components will
read only their documented serializable fields. The dispatcher will throw an
error containing model key, entry ID, and block key for unknown block types;
malformed required renderer data will also fail the build with the same
identity context.

Rendering unknown types as nothing is rejected because it can publish an
incomplete page without signalling a model/site compatibility error. Building
a generic renderer from the server's block registry is rejected because the
Astro site must not depend on CMS implementation internals.

### Render Tiptap JSON as a structural allowlist

Rich text will be represented by recursive node/mark components or equivalent
typed template branches, not `set:html` or generated HTML strings. It will
recognize only the node and mark types accepted by `content-validation`, retain
only the permitted heading and link fields, and reject unsafe URL values before
creating an anchor. Unexpected nodes, marks, attributes, or URLs will produce
no raw/executable output and will surface as a build/render error.

Sanitizing an arbitrary HTML string is rejected because the source contract is
structured safe Tiptap JSON and a sanitizer would broaden the rendering attack
surface. Trusting the server-side validator alone is rejected as defence in
depth: fixture and integration inputs remain unable to inject raw HTML.

## Risks / Trade-offs

- [Astro evaluates route modules in more than one phase] → the loader owns a
  module-scoped promise and all route code calls it, so each process performs
  at most one live export request.
- [A source change can make the hard-coded starter renderer stale] → unknown
  blocks and missing starter route data fail with stable identifiers, making
  the incompatibility visible during build.
- [Fixture behavior could diverge from live response validation] → parse the
  fixture with the shared build-export DTO schema before deriving any routes.
- [Rich-text recursion can accidentally bypass escaping] → pass text through
  Astro's ordinary escaped interpolation and cover hostile node/mark/URL
  inputs with focused tests.

## Migration Plan

1. Expand the starter models' allowed block lists and increment their versions.
   Add Astro and the SDK workspace dependency to `apps/site`, replace the
   placeholder scripts/configuration, and add the build-data loader and routes.
2. Add components, fixture data, focused renderer tests, and an end-to-end
   fixture build/output test.
3. Verify the package build in fixture mode followed by the root quality gates
   and strict OpenSpec validation. Reversion restores the placeholder site and
   has no persisted CMS or API migration to undo.
