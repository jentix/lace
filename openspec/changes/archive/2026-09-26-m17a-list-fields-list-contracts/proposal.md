## Why

Roadmap Step 17 (Shell and collection lists), Session 17A, prepares the data
the rebuilt shell and collection list (Sessions 17B and 17C) need. Today an
admin entry summary carries only an ID, title, revision, published snapshot ID,
and update time. A list cannot show an entry's slug, whether its draft differs
from the published version, when it was published, or who last changed it
without showing raw identifiers. It also cannot search, filter by state, sort,
or show per-state counts. Models cannot say which of their own fields belong in
a list. This change supplies those contracts and leaves the UI unchanged. It
follows architecture §8 (code-first configuration, display metadata outside the
structural hash), §9.2–§9.3 (entry and snapshot state), and §12 (shared runtime
contracts, cursor pagination, explicit DTOs), plus the Step 17 outcome of lists
that show what exists and who changed it without internal IDs.

## What Changes

- Add optional `listFields` to `defineCollection`. It names the model's own
  scalar fields (text, textarea, number, boolean, select, date, datetime, URL)
  that a list shows. Configuration rejects unknown, duplicate, rich-text, and
  media fields. `listFields` is display metadata: it changes the projection
  hash, not the structural hash, so it never requires a version bump. The admin
  configuration projection and the `GET /api/v1/admin/content-models` DTO carry
  it.
- Extend each admin entry summary with the draft `slug` and a derived `status`.
  `draft` means never published, `published` means the draft matches the
  published revision, and `changed` means a published entry has a newer draft.
  The summary also gains `publishedAt`, `updatedBy` (`id` and `displayName`),
  and `listValues`, which holds the draft's values for the model's
  `listFields`.
- Add `q` (case-insensitive title or slug substring), `status`, and `sort`
  (`updatedAt`, `title`, or `publishedAt`, either direction; default
  `-updatedAt`) to `GET /api/v1/admin/models/:modelKey/entries`. The response
  gains per-status `totals` for the current search. Continuation cursors are
  bound to the query that produced them.
- Admin entry responses (load, create, save, publish) gain a top-level
  `updatedBy` with the draft's last editor's `id` and `displayName`, so a viewer
  never needs the users API. Public and build-export entry DTOs stay the same
  and never carry display names.
- Update the admin client to the new admin entry DTO and optional list query.
  Cover configuration, contracts, OpenAPI output, the Node and in-memory
  repositories, the use cases, the HTTP routes, and the negative cases.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `content-model-configuration`: collection `listFields` definition,
  validation, projection, and exclusion from structural identity.
- `rest-contracts`: admin entry-list query, summary, totals, and model
  `listFields` contracts, plus the admin entry DTO's last-editor name.
- `content-use-cases`: list queries pass validated filters and the model's list
  fields, and resolving an editor's display name requires `content:read`.
- `node-content-repositories`: query-bound admin list cursors for each sort,
  derived status, per-status totals, list values, and editor display names.

## Impact

- Packages: `@lacecms/config` (definition, validation, hashing),
  `@lacecms/contracts` (schemas, mappers), `@lacecms/application` (ports, use
  cases, display-name fallback), `@lacecms/platform-node` (SQLite queries),
  `@lacecms/test-utils` (in-memory reference store), `@lacecms/server`
  (routes, OpenAPI), `apps/api/openapi/api-v1.json`, `apps/admin` API client and
  fixtures, the reference `lace.config.ts`, and architecture §8 and §12 notes.
- No database migration. The new queries use existing tables and the existing
  `content_entries_list_idx` for the default sort.
- Breaking for admin API consumers only. The admin summary gains required
  fields, the list response gains `totals`, and admin entry responses gain
  `updatedBy`. Only the bundled admin consumes these, and this change updates
  it. Version 1 admin list cursors are rejected once and clients restart from
  the first page. Public, SDK, and build-export contracts do not change.
- Dependencies: accepted `content-model-configuration`, `rest-contracts`,
  `content-use-cases`, `node-content-repositories`, and `configuration-synchronization`
  (a `listFields` change syncs as a projection-only update). Step 16 provides
  the admin structure this change edits. Sessions 17B and 17C consume these
  contracts.
- Non-goals: any shell, list, or table UI (17B/17C); editable user display
  names; full-text or Unicode case-folded search; indexes for non-default
  sorts; media, users, or build list contracts; Cloudflare D1 adapters (not yet
  implemented). The SQL stays SQLite/D1-compatible.
