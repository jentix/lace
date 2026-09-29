# Lace operational CLI

Build the workspace packages, then run `pnpm lace --help` in this repository or `pnpm exec lace --help` in a generated project. Commands are `db migrate`, `content sync [--check]`, and `auth bootstrap`. Each supports `--json` and `--target node|cloudflare-local|cloudflare-remote`.

Deployment order:

1. Select a target and export its environment variables. The default `node` target requires `LACE_DATABASE_PATH` and never selects Cloudflare implicitly. For `cloudflare-local`, set `LACE_D1_DATABASE_ID` and `LACE_CLOUDFLARE_PERSIST_TO`. For `cloudflare-remote`, set `CLOUDFLARE_ACCOUNT_ID`, `LACE_D1_DATABASE_ID`, and `CLOUDFLARE_API_TOKEN`; pass `--target cloudflare-remote` explicitly. D1 migration also needs `LACE_WRANGLER_CONFIG` pointing to a Wrangler file whose `DB` binding matches the selected ID. In this repository the default is `apps/api/wrangler.jsonc`.
2. Run `lace db migrate --target <target>` before starting the API. Startup does not run migrations. Readiness stays unavailable until the checked-in migrations are installed.
3. Run `lace content sync --target <target>` to apply the existing guarded configuration plan. Use `lace content sync --check --json` in CI; exit `0` means current and exit `2` means pending changes. An invalid plan exits `6` without mutation.
4. Run `lace auth bootstrap --target <target>` only during first-admin setup. Capture its one-time token securely and submit it with email and password to `/api/v1/setup/admin` before expiry. Once setup completes, the command refuses another token.

Exit codes: `0` success, `2` sync pending, `3` command usage, `4` missing or invalid configuration, `5` missing migration, and `6` failed operation. `--json` prints one result object to stdout, including one-time token data only for successful bootstrap. Other failures print sanitized diagnostics and no supplied secret value. The CLI never prompts, including in CI.

## Upgrade review (Step 24A)

`lace upgrade` currently produces a read-only plan. Prepare a pristine project with the target generator release in a separate parent directory, using the same project basename and optional `--cloudflare` setting as the installed project. Its `.lace/manifest.json` and managed bytes are the target template; the installed manifest hashes represent the old template. For example, with `/work/my-site` as the installed project and a reviewed target generator release:

```sh
mkdir -p /work/upgrade-target
cd /work/upgrade-target
pnpm dlx create-lace@<target-release> create my-site
cd /work/my-site
pnpm exec lace upgrade --template /work/upgrade-target/my-site
pnpm exec lace upgrade --template /work/upgrade-target/my-site --json
```

Replace `<target-release>` with an explicit compatible generator release. The planner does not download releases or choose a version. A different project basename will produce name changes in the diff. Different generator options can propose additions/removals of deployment files; review those decisions explicitly. Use physical directory paths: symbolic links in inspected paths are rejected.

`--project <dir>` selects the installed project explicitly; otherwise the current directory is used. No database, runtime credentials, config evaluation, or remote access is needed, including for Cloudflare. `--help` describes the command. JSON contains one object with `ok`, `code`, `message` and `data`; the plan includes sorted decisions, source/target template versions, hashes, unified diffs and change/conflict counts. Text diffs use whole-file hunks; binary differences get a notice. Plans contain the working deployment bytes in their diffs, so review their contents before sharing them.

Actions are `add`, `replace`, `remove`, `current`, `preserve` and `conflict`. Dependency and container-image updates are ordinary replacements when the working managed file still matches its baseline hash. Local edits are preserved when the template has not changed, and conflict when an upgrade would replace or remove them. A working file already equal to the target is current. Existing user-owned paths, `site/**` and `lace.config.ts` are preserved, and untracked files remain untouched. A newly managed path that already exists conflicts. Ownership changes from managed to user also need explicit resolution.

Upgrade exit codes are `0` for a conflict-free plan (including pending changes), `2` for conflicts, `3` for invalid arguments, `4` for invalid/missing manifests or unsafe inputs, and `6` for inspection failure. `--apply` is explicitly refused in 24A. All dry runs leave both directories unchanged, including manifests; transactional application, conflict artifacts, recovery and migration instructions belong to 24B. Hashes describe a read snapshot; they must be rechecked before a later apply.
