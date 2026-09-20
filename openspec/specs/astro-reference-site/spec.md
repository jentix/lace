# astro-reference-site Specification

## Purpose

Defines the reference Astro starter site that turns one published Lace export
into static routes and safely renders the starter content configuration.

## Requirements

### Requirement: Starter models allow the complete built-in block vocabulary
The starter `home` page model and `posts` collection model SHALL permit each
of the `hero`, `richText`, `image`, `quote`, and `cta` block types. Their model
versions SHALL advance when this permitted-block structure changes. The
reference fixture SHALL exercise every built-in block in generated published
routes while retaining the fixed home path and per-slug blog route.

#### Scenario: Starter configuration is normalized
- **WHEN** the starter configuration is loaded after the expanded block lists
- **THEN** both `home` and `posts` allow all five built-in block types at their
  incremented model versions

#### Scenario: Fixture build uses every built-in block
- **WHEN** the committed export fixture is built
- **THEN** its generated home and blog output together render `hero`,
  `richText`, `image`, `quote`, and `cta`

### Requirement: Reference site derives all starter routes from one published export
The reference site SHALL build the starter home route and every published post
route from one validated Lace build export. In live mode it SHALL perform one
authenticated build-export read for the complete build and SHALL derive route
parameters and entry data locally; it SHALL NOT issue page, collection, path,
or per-entry requests. In fixture mode it SHALL read the committed export
fixture and SHALL make no CMS request. Only entries in the build export SHALL
be eligible for rendered output.

#### Scenario: Live build receives a published export
- **WHEN** a live build is configured with a valid API base URL and build token
- **THEN** it performs one authenticated build-export read and statically emits
  the home route and one blog route for each exported `posts` entry

#### Scenario: Fixture build runs without CMS access
- **WHEN** the fixture build selects the committed export fixture and has no
  reachable CMS endpoint
- **THEN** it completes using that fixture alone and makes no network request

#### Scenario: A draft-only value exists outside the export
- **WHEN** a CMS draft contains a route or content value that is absent from the
  supplied build export
- **THEN** the generated site contains neither that route nor that value

### Requirement: Reference site renders the starter blocks deterministically
The reference site SHALL render the `hero`, `richText`, `image`, `quote`, and
`cta` built-in block types for the starter models, preserving their exported
order. It SHALL create media links only through the public-media URL helper so
the emitted URL retains the configured API base path. An unsupported block
type SHALL fail the build before static output is accepted and the failure
SHALL identify the model key, entry identifier, and block key.

#### Scenario: A starter entry contains each supported block type
- **WHEN** an exported entry supplies valid built-in blocks in a defined order
- **THEN** its static page renders each block in that order and uses the
  configured stable public-media URL for media references

#### Scenario: An exported block has no renderer
- **WHEN** an exported entry contains a block type outside the five built-ins
- **THEN** the build fails with its model key, entry identifier, and block key

### Requirement: Reference site renders rich text through an allowlist
The reference site SHALL render rich text structurally from the shared safe
Tiptap subset: `doc`, `paragraph`, `text`, `heading`, `bulletList`,
`orderedList`, `listItem`, `blockquote`, and `hardBreak` nodes; and `bold`,
`italic`, `strike`, `code`, and `link` marks. It SHALL not inject raw rich-text
JSON or HTML. Unsupported nodes, marks, attributes, or unsafe link values
SHALL not be emitted as executable or raw HTML content.

#### Scenario: Safe formatted rich text is exported
- **WHEN** a block contains an allowlisted rich-text document with supported
  formatting and links
- **THEN** the generated page contains the corresponding structural HTML and
  no serialized rich-text JSON

#### Scenario: Unsafe rich text reaches the renderer
- **WHEN** rich-text input contains an unsupported node, mark, attribute, or
  unsafe link value
- **THEN** the generated output contains no executable markup or unsafe URL
  derived from that input
