## ADDED Requirements

### Requirement: Published routes expose a stable entry styling scope
Every static route emitted for a published `home`, `about`, `posts`, or `notes` entry SHALL have exactly one container around that entry's ordered blocks with `data-lace-model` equal to the stable model key and `data-lace-entry` equal to the stable entry identifier. These values SHALL come from the published build export and SHALL be HTML-attribute escaped. The styling scope SHALL NOT expose draft-only content or an automatically generated HTML `id`.

#### Scenario: Style one model or one collection entry
- **WHEN** the build export contains a published `home` page and two published `posts` entries
- **THEN** each emitted route has one entry scope, the `posts` routes share `data-lace-model="posts"`, and each has its own stable `data-lace-entry` value

#### Scenario: Draft differs from publication
- **WHEN** an entry has a later draft with changed blocks or slug
- **THEN** the static route and its styling attributes continue to reflect the published entry until another publication and build

### Requirement: Every built-in block exposes type and instance styling hooks
The root HTML element of each rendered `hero`, `richText`, `image`, `quote`, and `cta` block SHALL carry `data-lace-block` equal to its registered type and `data-lace-block-key` equal to its stable key. A block key SHALL be treated as unique within its entry scope, so a selector for one instance SHALL combine the entry scope and block key. Hooks SHALL preserve the block order and semantic root elements. Unsupported block types SHALL continue to fail the build as specified by the existing reference-site renderer requirement.

#### Scenario: Reuse a block type across routes
- **WHEN** two published routes contain `hero` blocks with different keys
- **THEN** both roots expose `data-lace-block="hero"` and each exposes its own `data-lace-block-key`

#### Scenario: Same key appears in separate entries
- **WHEN** two published entries contain a block with the same stable key
- **THEN** the two routes remain addressable through their distinct entry scopes without requiring document-wide uniqueness of the block key

#### Scenario: Unknown renderer
- **WHEN** a published block has no site renderer
- **THEN** the build fails with the existing model, entry, and block diagnostic rather than emitting an unstyled or partially rendered block

### Requirement: Built-in blocks expose semantic part hooks
The built-in renderers SHALL use `data-lace-part` on their own rendered semantic parts. The supported values SHALL be: `hero` — `eyebrow`, `heading`, `body`, `media`, `action`; `richText` — `content`; `image` — `media`, `caption`; `quote` — `text`, `attribution`; and `cta` — `heading`, `body`, `action`. An optional part SHALL be absent when its content is absent. The hooks SHALL NOT admit arbitrary content-supplied attributes or weaken the existing safe rich-text and URL rules.

#### Scenario: Fully populated starter blocks
- **WHEN** published blocks supply all supported fields
- **THEN** their output exposes the corresponding part hooks under the correct block root, including hooks around rich-text body or content fragments

#### Scenario: Optional content is absent
- **WHEN** a published `hero` omits its image and action or an `image` block omits its caption
- **THEN** the corresponding `media`, `action`, or `caption` part is absent, with no empty placeholder introduced solely for styling

#### Scenario: Unsafe rich-text input
- **WHEN** a rich-text value contains an unsupported node, mark, attribute, or unsafe URL
- **THEN** the styling hooks do not cause executable markup or unsafe URL to appear in the generated page

### Requirement: Site owners can use the styling hooks from site-owned CSS
The reference site SHALL document its public `data-lace-*` selector contract and demonstrate selectors for all blocks of one type, all blocks of that type in one model, and one block in one entry. The example SHALL work from a site-owned stylesheet without modifying the block renderer or CMS data. The documentation SHALL identify HTML tag names and existing incidental classes as non-contractual styling details.

#### Scenario: Site owner changes CSS only
- **WHEN** a site owner edits the documented global stylesheet using the supported selectors and rebuilds the site
- **THEN** the static output can style the selected scope without changing block data, REST responses, or renderer source
