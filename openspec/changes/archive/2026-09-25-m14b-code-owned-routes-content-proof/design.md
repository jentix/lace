## Context

See proposal.md. `lace.config.ts` owns model definitions; the Node API imports it on startup and `content:sync` applies model changes to SQLite. The site loader obtains one validated published export through `@lacecms/sdk`, caches a successful result for the Astro process, and currently projects only `home` and `posts`. `BlockRenderer.astro` already supports all five built-in blocks. The local stack starts in fixture mode until an administrator creates a read-only build token and opts into live mode.

## Goals / Non-Goals

**Goals:** Prove that added models require explicit code-owned Astro routes, synchronized admin models, publication, and a site refresh. Retain one export read and published-only route generation.

**Non-Goals:** Route generation by the CMS, new API/SDK endpoints, browser token use, automatic rebuilds, new block vocabulary, or production deployment.

## Decisions

1. **Add `about` and `notes` as distinct starter examples.** Define a singleton page at `/about` and a collection at `/notes/:slug`, both with the existing built-in block vocabulary. Give `notes` a simple optional text field to demonstrate a field definition without adding a new field implementation. New models begin at version 1. Keep `home` and `posts` unchanged. An alternative of changing the existing blog route would disrupt the accepted starter contract and obscure the difference between pages and collections.
2. **Project each configured route explicitly in `apps/site`.** Extend the server-side export projection with `about` and `notes`; create `about.astro` and `notes/[slug].astro` using `BlockRenderer`. Validate published paths and slug uniqueness for the new collection as the existing posts projection does. An abstract route generator would make route ownership less visible and could imply that CMS configuration automatically creates site pages.
3. **Keep fixture mode complete and deterministic.** Add published about and notes examples to the committed fixture, plus draft-only sentinel values, so the fixture build covers all four routes without a CMS request. Keep live mode on a single authenticated export. Tests cover projection, route emission, and draft isolation.
4. **Use the existing local stack for the full proof.** A repeatable browser exercise starts with a migrated stack, performs explicit sync, edits the new page and collection entry in Admin, publishes them, checks public API output, restarts the site, and inspects the pages. It then saves a later draft and confirms the API and site still show the earlier publication. Keep this as an opt-in integration flow so routine unit tests remain isolated. When a Docker daemon or browser is unavailable, report that limitation rather than claiming the full flow passed.
5. **Document the authoring sequence near the existing local guide.** Explain config registration, versioning, API restart, sync, admin editing and publication, build token, site restart, and public URL verification. Structural changes require a version bump; label-only changes do not. A new block also needs a matching site renderer; merely allowing it in config is insufficient. No database migration is required for adding models through sync.
6. **Accept the editor's stable block key format at the shared validation boundary.** The browser editor already assigns ULID-format keys, as required by `admin-draft-editor`, but `packages/content` currently applies the block-type pattern to aggregate keys; that pattern rejects ULIDs starting with a digit. Extend only the aggregate key validation to accept canonical ULIDs alongside existing named stable keys. Preserve duplicate and malformed-key rejection. Generating a different browser key would conflict with the accepted editor spec, and weakening the block-type registry pattern would conflate two distinct identifiers. This shared validator keeps Node and Cloudflare behavior aligned.

## Risks / Trade-offs

- [A live site with an unpublished `about` entry] → Treat it as an absent optional route; keep the home publication prerequisite.
- [A draft slug differs from the published slug] → Derive static paths only from export publication path and snapshot.
- [A new block is configured without a renderer] → Preserve build failure with model, entry, and block identifiers.
- [A browser-generated ULID begins with a digit] → Validate it as a stable block key and keep its value through draft save and publication.
- [The local daemon is unavailable during verification] → Run deterministic site checks and leave the opt-in full-stack flow documented for a daemon-equipped environment.

## Migration Plan

Restart the API after pulling the new config, inspect `pnpm content:sync --check`, then run `pnpm content:sync`. This creates an `about` draft and an empty `notes` collection. Publish content through Admin, then restart the site process in live mode. Rollback removes the added site routes and model definitions only after content has been removed through the supported workflow; sync intentionally blocks destructive removal with stored entries.
