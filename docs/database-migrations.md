# Database migrations

Lace database changes are explicit, ordered, forward-only migrations shared by
Node SQLite and Cloudflare D1. Backward/down migrations are not supported.

Generate a migration after changing the shared Drizzle schema:

```bash
pnpm db:generate
```

Apply all checked-in migrations to a Node SQLite file and print its installed
migration records:

```bash
LACE_DATABASE_PATH=./lace.sqlite pnpm db:migrate:node
```

Run this command as a deployment step before starting the Node runtime. If a
production migration needs correction, restore a verified database backup or
ship a reviewed later forward migration; do not edit an already-applied
migration file.

Node content repositories require this migration before they are constructed.
They currently provide bounded reads plus atomic creation and complete-draft
saves. Guarded publication and entry deletion are intentionally deferred to
Session 5C, so runtimes must not expose those mutations until that session is
deployed.
