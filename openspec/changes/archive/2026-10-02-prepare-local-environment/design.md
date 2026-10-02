## Context

See proposal.md for scope and authority. The CLI currently loads database settings before dispatch and generated operator scripts require `.env`. Templates have five blank controlled assignments and deterministic managed hashes. Error presentation already centralizes sanitized recovery diagnostics.

## Goals / Non-Goals

Goals: prepare local credentials before runtime initialization, publish complete bytes safely under concurrency, preserve template settings and existing configuration. Non-goals: dotenv shell evaluation, remote provisioning, rotation, schema changes, doctor or new package versions.

## Decisions

- Extend argument parsing with `env prepare`, reject all explicit targets and `--check`, and dispatch before environment loading and runtime imports. Keep the Node filesystem implementation in `packages/cli`; application/platform packages need no changes. The command works for local generated settings irrespective of optional Cloudflare template files, without mutating Cloudflare.
- Open the template without following symlinks and verify the open descriptor is a regular file. Replace exactly one simple single-line assignment for each controlled name; reject ambiguous/duplicate/multiline controlled values. Preserve all other bytes and line endings. Do not evaluate text or use process credentials. A shell `cp` plus substitutions was rejected because it exposes partial output and depends on platform tooling.
- Generate hex from Node crypto: 32 bytes for auth, MinIO root secret and builder, 10 bytes (20 hex characters, 80 bits) would be insufficient; use 15 bytes encoded as base64url with `-` and `_` rejected by regeneration to yield 20 alphanumeric characters and approximately 119 bits of entropy. This meets MinIO's access key length constraints without punctuation; service secrets use 64 hex characters.
- Check destination with `lstat` for early refusal but enforce no overwrite through same-filesystem hard-link publication, not the check itself. Use a random private `.lace-env-*` directory in the project root (`0700`) and exclusive staged file (`0600`), finish writes, fsync and close before linking to `.env`. Remove staging in finally. Rename was rejected because it can overwrite racing destinations; exclusive destination writes were rejected because they expose partial credentials. No unsafe fallback if hard links are unsupported.
- Reuse CLI result/error envelopes and exit codes. Add trusted diagnostic kinds for existing env, template missing/invalid and local preparation filesystem access. Never print template content, paths or random values. Success tells the operator to review settings and obtain the build token through Settings.
- Add focused rendering/IO failure tests with injected filesystem operations and real child-process concurrency. Extend the existing packed consumer acceptance `packages` phase to run preparation, verify file protection, settings, no leaks and repeat preservation before returning. Generator snapshots verify managed hashes. Keep template and package version refresh in Step 32B as the roadmap directs; record that this source revision requires freshly packed artifacts, not the previously published alpha.

## Risks / Trade-offs

- Hard-link support is required → fail closed with local filesystem recovery advice; generated Linux/macOS local storage supports it.
- Process termination before publication can leave a private staging directory → ignore `.lace-env-*` in generated Git configuration; document removal after verifying no preparation runs. Destination is either absent or complete, and retry never replaces it.
- Template syntax is intentionally constrained for controlled keys → report CONFIG and name the required single-line assignment form without echoing values. Other settings are copied verbatim.
- Owner-only mode is a POSIX guarantee; Windows ACL configuration remains operator responsibility.

## Migration Plan

No database migration. Existing projects retain `.env`; adopt the generated script through normal managed-file upgrade review. Fresh source/packed consumers prepare first. Rollback removes command/script changes and preserves operator configuration. Next alpha delivery/version selection remains Step 32B.
