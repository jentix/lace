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
They provide bounded reads, draft lifecycle writes, guarded publication, and
entry deletion. Public-projection mutations atomically enqueue durable build
work; build dispatch occurs later. Media deletion only marks unreferenced media
for asynchronous cleanup, never deleting an object in the database transaction.
Repository contract tests run against both file-backed and in-memory SQLite.
