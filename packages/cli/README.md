# Lace operational CLI

Build the workspace packages, then run `pnpm lace --help` in this repository or `pnpm exec lace --help` in a generated project. Commands are `db migrate`, `content sync [--check]`, and `auth bootstrap`. Each supports `--json` and `--target node|cloudflare-local|cloudflare-remote`.

Deployment order:

1. Select a target and export its environment variables. The default `node` target requires `LACE_DATABASE_PATH` and never selects Cloudflare implicitly. For `cloudflare-local`, set `LACE_D1_DATABASE_ID` and `LACE_CLOUDFLARE_PERSIST_TO`. For `cloudflare-remote`, set `CLOUDFLARE_ACCOUNT_ID`, `LACE_D1_DATABASE_ID`, and `CLOUDFLARE_API_TOKEN`; pass `--target cloudflare-remote` explicitly. D1 migration also needs `LACE_WRANGLER_CONFIG` pointing to a Wrangler file whose `DB` binding matches the selected ID. In this repository the default is `apps/api/wrangler.jsonc`.
2. Run `lace db migrate --target <target>` before starting the API. Startup does not run migrations. Readiness stays unavailable until the checked-in migrations are installed.
3. Run `lace content sync --target <target>` to apply the existing guarded configuration plan. Use `lace content sync --check --json` in CI; exit `0` means current and exit `2` means pending changes. An invalid plan exits `6` without mutation.
4. Run `lace auth bootstrap --target <target>` only during first-admin setup. Capture its one-time token securely and submit it with email and password to `/api/v1/setup/admin` before expiry. Once setup completes, the command refuses another token.

Exit codes: `0` success, `2` sync pending, `3` command usage, `4` missing or invalid configuration, `5` missing migration, and `6` failed operation. `--json` prints one result object to stdout, including one-time token data only for successful bootstrap. Other failures print sanitized diagnostics and no supplied secret value. The CLI never prompts, including in CI.
