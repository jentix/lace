## Context

See `proposal.md` for motivation and `specs/astro-reference-site/spec.md` for observable behavior. The accepted architecture keeps `site/**` user-owned and gives the CMS control of content, not Astro presentation. The site builds routes from a validated published export. Its `SiteEntry` carries `id`, `modelKey`, `path`, and ordered `blocks`; each `SiteBlock` carries `key`, `type`, `schemaVersion`, `position`, and `data`. The shared public DTO already transports these identifiers. `content_blocks` uses `(snapshot_id, block_key)` as its primary key, and publication copies the stable key.

All four current routes (`home`, `about`, `posts`, `notes`) wrap `BlockRenderer.astro` in `BaseLayout.astro`. `BlockRenderer.astro` dispatches to five components and fails on an unknown type. Current block markup and data are:

| Type | Field data (`required` marked *) | Current root and children |
| --- | --- | --- |
| `hero` | `heading`*, `eyebrow`, rich-text `body`, media `image`, `primaryActionLabel`, `primaryActionUrl` | `section.hero`; optional paragraph, `h1`, rich-text fragment, image, link |
| `richText` | rich-text `content`* | `section.rich-text`; rich-text fragment |
| `image` | media `media`*, `alt`*, `caption` | `figure`; image, optional `figcaption` |
| `quote` | `quote`*, `attribution` | `blockquote`; paragraph, optional footer |
| `cta` | `heading`*, `actionLabel`*, `actionUrl`*, rich-text `body` | `aside.cta`; `h2`, optional rich-text fragment, link |

Rich-text fragments come from `RichText.astro` and the safe node/mark renderers. They have no single root today. The fixture exercises all five types, but its `about` hero lacks optional parts; this makes it useful for checking absence. Existing classes cover only `hero`, `rich-text`, and `cta` and do not expose per-entry or per-instance scope.

## Goals / Non-Goals

**Goals:** Define a small, stable public HTML selector API for model, entry, block type, block instance, and direct semantic parts. Keep selectors useful from one global site stylesheet, with no CMS runtime involvement. Retain native semantic HTML and the current security boundary.

**Non-Goals:** Model/editor settings, style persistence, responsive controls, variants, arbitrary HTML IDs, selectors for every rich-text node, or modifying the admin design-token system. A styling hook does not promise an exact visual draft preview.

## Decisions

### 1. Scope entries at the existing layout boundary

Pass each route's `SiteEntry` to `BaseLayout.astro` and put `data-lace-model={entry.modelKey}` and `data-lace-entry={entry.id}` on its existing `<main>`. Keep the current title prop or derive it from the entry; do not add another container. `entry.id` is stable across slug changes and is already present in public export data. A readable path selector was considered but rejected as the primary per-entry hook because slugs can change. A code-defined page model key selects singleton pages directly. The IDs are opaque public identifiers, not credentials.

### 2. Put block hooks on existing semantic roots

Each of the five components puts `data-lace-block={block.type}` and `data-lace-block-key={block.key}` on its root. `BlockRenderer.astro` continues to dispatch and reject unsupported types; it does not add a generic wrapper, preserving `figure`, `blockquote`, `section`, and `aside` semantics. Keep existing classes for compatibility, but document only `data-lace-*` as the stable styling API. `block.key` is unique within an entry, not necessarily across entries; documentation always combines `data-lace-entry` with `data-lace-block-key` for single-instance selectors. Do not synthesize HTML `id`, since it would have to be document-wide unique and would introduce implicit anchor behavior.

### 3. Expose a restrained vocabulary of semantic parts

Use one `data-lace-part` value per direct conceptual part, as enumerated in the delta spec. Attach it to existing elements when possible: hero eyebrow/heading/image/action; image media/caption; quote text/attribution; CTA heading/action. Wrap rendered rich-text fragments for hero/CTA `body` and richText `content` in a neutral `<div data-lace-part="...">`; this wrapper is needed because a rich-text document can render multiple root nodes. Do not modify `RichTextNodes.astro` or `RichTextMarks.astro` or pass CMS data into arbitrary attributes. Optional parts render no node when their source field is absent. Use `media` as the part name for both hero and image blocks even though the hero data field is named `image`, so the CSS vocabulary reflects visual roles rather than storage keys.

### 4. Make the site stylesheet the customization point

Add a site-owned global CSS entry file imported by `BaseLayout.astro`, and document example rules in `docs/site-styling.md`, linked from `docs/node-api.md`. The global file is the place for user overrides; component-local Astro `<style>` rules are scoped and can be surprising for styling children across component boundaries. Keep the sample low-specificity (`:where(...)`) and avoid `!important`, so site owners can build a predictable cascade. Do not add a CSS framework, runtime style registry, or CMS-side style storage. This differs from the admin's own design tokens: the public site's style system belongs to the generated project.

### 5. Verify rendered HTML at the static output boundary

Extend `apps/site/src/fixture-build.test.mjs` to inspect all four generated routes. Assert one entry scope per page, the expected block root attributes in fixture order, all relevant part attributes, absent optional hero parts on `about`, and absence of draft-only content. Check HTML attribute escaping with a focused renderer test or representative fixture value without weakening current URL and rich-text validation. Keep the existing unknown-renderer test and no-CMS fixture build behavior. No Node/Worker adapter contract changes are needed because the hooks are derived solely from the same public build-export DTO.

## Risks / Trade-offs

- **Public selector names become a compatibility contract** -> Keep the vocabulary narrow, document the exact names, and assert them in static-build tests. Internal tag names and old incidental classes are not promised as stable selectors.
- **Global CSS can collide with component-local styles** -> Use low-specificity examples and one imported site stylesheet; document Astro scoping and the cascade. Favor CSS custom properties later if components gain complex private styles.
- **Opaque entry IDs are inconvenient to write by hand** -> Show how to copy the value from rendered HTML and use the model key for singleton pages. A future explicit editorial style key could improve ergonomics without changing this contract.
- **New rich-text wrapper elements can affect inherited CSS or selectors** -> Limit wrappers to the three fragment locations, retain semantic root elements, and inspect the fixture build for regressions.
- **User-owned generated sites do not receive changes automatically** -> This change updates the reference site and future template inputs; Step 23 generator work must carry the contract into newly generated projects, while later upgrades of existing user-owned sites require documentation or an explicit codemod.

## Migration Plan

No database, config, REST, or SDK migration. Add hooks and the stylesheet to the reference site, build the fixture, then deploy the regenerated static output. Rollback is a site-source revert and rebuild; content remains valid. Update the roadmap with Step 21.5 and its single Session 21.5A before implementation and ensure the Step 23 generator adopts the same site-owned convention when it is created.
