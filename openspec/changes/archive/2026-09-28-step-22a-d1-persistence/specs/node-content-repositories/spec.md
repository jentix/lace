## MODIFIED Requirements

### Requirement: Node adapters map to portable content values through permitted dependencies
The Node platform adapter SHALL be permitted to consume portable domain and
content values through their declared public package entry points when mapping
SQLite records to application contracts. Dependency enforcement SHALL continue
to reject reverse dependencies and cycles. Runtime-neutral SQLite-dialect row
mapping, cursor encoding, and shared SQL fragments used by both the Node and D1
adapters SHALL be permitted to live in the shared schema package so both
runtimes map the same rows identically; that shared code SHALL NOT use Node-only APIs, and each
platform adapter SHALL still declare its own domain and content dependencies.

#### Scenario: Node repository passes architecture-boundary verification
- **WHEN** the Node repository imports the portable value constructors and JSON
  types needed to return application content contracts
- **THEN** the source-level boundary verification accepts those public-entry-point
  dependencies and still rejects a cycle or an undeclared cross-package import

#### Scenario: Shared row mapping is runtime-neutral
- **WHEN** Node and D1 adapters decode the same cursor or stored rows through
  the shared SQLite-dialect helpers
- **THEN** they produce equal portable values, and the shared helpers import no
  Node built-in module

### Requirement: Node public mutations are atomic
The Node persistence adapter SHALL atomically publish guarded drafts, replace routes, advance public state, coalesce build work, retain idempotent responses, delete entries, and mark only unreferenced active media for asynchronous deletion.

#### Scenario: Route collision rolls back publication
- **WHEN** a publication path is owned by another entry
- **THEN** the adapter returns the stable `CONTENT_ROUTE_CONFLICT` failure and
  routes and public projections remain unchanged

#### Scenario: Media deletion is asynchronous
- **WHEN** eligible media is marked for deletion
- **THEN** it becomes deleting with an independent event and no binary object deletion
