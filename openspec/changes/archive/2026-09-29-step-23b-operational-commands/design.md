## Context

See `proposal.md`. The Node adapter already has migration, sync, and security services; the Cloudflare adapter has D1 sync and security services. Existing `scripts/cloudflare.mjs` runs Wrangler migrations, and local Cloudflare setup runs through Miniflare. `packages/cli` is a placeholder. Node and Worker readiness currently probe `select 1` only. Drizzle records Node migrations in `__drizzle_migrations`; Wrangler records D1 migrations in `d1_migrations`.

## Goals / Non-Goals

**Goals:** one operator interface; explicit target identity; reuse existing guarded sync and setup services; migration currency in readiness; redacted, parseable output.

**Non-Goals:** general data migrations, an HTTP operator endpoint, installing the generated project from published packages (23C), and automatic startup migration.

## Decisions

1. Put argument parsing, environment selection, output, and error mapping in `@lacecms/cli`. Select `node` by default only for an explicit local SQLite path. `cloudflare-local` uses a selected persistent Miniflare state directory and D1 database ID. `cloudflare-remote` requires explicit target plus Cloudflare account/database IDs and API token. Avoid a generic `--remote` inferred from Wrangler defaults.
2. Use the existing Node migration function. Use Wrangler for D1 migrations, with explicit `--local`/`--remote`, fixed configuration, and no interactive prompt in CI. A child-process failure yields a sanitized code and command name, not raw environment or provider output. Inspect migration tables afterward for operator reporting.
3. Use the existing application planner and guarded apply for both adapters. Node uses `NodeContentRepository`; D1 local uses `D1ContentRepository`; remote D1 uses a thin REST-backed `D1Database` implementation with prepared parameter binding and a single API batch request for each repository batch. This preserves D1 guarded SQL and transaction ordering. Provider responses are validated and errors sanitized. Do not add a second sync algorithm.
4. Load only the root `lace.config.ts` in the CLI process, using the same normalized shape check as the API composition. A user-supplied HTTP path cannot select executable config.
5. Compare installed migration identities with the checked-in Drizzle journal for Node and Wrangler migration names for D1. Readiness queries only migration metadata; it never changes schema. Node startup reports a migration-needed diagnostic; Worker readiness returns 503 until explicit migration runs.
6. Emit exactly one JSON object for `--json` and separate success, pending sync, validation, operation failure, and schema-outdated exit codes. Token plaintext is included only in a successful bootstrap result; errors are allowlisted and do not echo provider payloads.

## Risks / Trade-offs

- [Remote D1 API batch behavior differs from Worker D1] → Test adapter response shape and rollback semantics with a controlled remote-compatible fixture before enabling mutation.
- [Mixed migration ledgers] → Compare each target against its own ledger and the same checked-in migration inventory.
- [Bootstrap token appears in CI logs] → Emit it only as the explicit command result, document that the caller must capture it securely, and never echo it in diagnostics.
- [Outdated schema prevents other operations] → Migration is the documented first deployment step; sync/bootstrap fail with a migration-needed code.

## Migration Plan

Deploy CLI and API code, run `lace db migrate --target <name>` explicitly, then `lace content sync`, then `lace auth bootstrap` if setup is incomplete. A failed forward migration is repaired with a subsequent forward migration; database downgrade is unsupported. Existing local scripts can delegate to the CLI after parity is verified.
