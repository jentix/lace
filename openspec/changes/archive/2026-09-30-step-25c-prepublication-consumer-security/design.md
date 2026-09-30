## Context

See proposal.md. The generated acceptance runner owns disposable consumers and Compose cleanup. Release tooling already verifies checksums and shipping metadata and prepares both container architectures. No product contract or migration needs changing.

## Goals / Non-Goals

**Goals:** Add an inventory-driven mode to existing acceptance and reuse its HTTP/operator journey. Strengthen its essential checks and produce evidence tied to immutable artifacts.

**Non-Goals:** Browser automation, vulnerability/license audit, backup drills, remote accounts and publication belong to Step 26 or an owner release action.

## Decisions

- Verify a complete publication-eligible inventory before generation; extract and inspect all packages and invoke the extracted create-lace executable. Use matching selected-platform image IDs with label/platform checks. Repacking current source would weaken evidence and is rejected.
- Keep test artifact substitution in the disposable consumer only, preserve delivered archive/template bytes, and use relative file references so the mounted builder can perform frozen installs. Check installed real paths and lockfile references. Do not patch consumer renderer/config/Compose to bypass failures.
- Use supported user-management, setup, login, draft, token and build endpoints. Compare published exports before/after denied calls and later drafts. Reuse one uploaded object in hero/image blocks and fetch its original bytes from outside Docker.
- Stop/recreate Compose without removing volumes for persistence. For failure use a randomly generated invalid build token, check byte-identical old served HTML, and accelerate only disposable outbox retry timestamps through the packaged SQLite adapter, as existing VPS integration does. Restore credentials and call the supported retry endpoint.
- Scan package/generated/static bytes and exported image filesystems/configuration for credentials. Accumulate and inspect captured child output; keep raw output private and only sanitize errors. Exclude intentional local .env, installed dependencies and database from generated shipping scans. Unit-test inventory rejection and scanner leakage cases.
- Run one full consumer platform on the host architecture; retain 25B's independent image smokes for both architectures and report this distinction. Run local Node/D1 and Worker tests plus root checks. Store tested inventory identity/checksums in committed evidence without secrets.

## Risks / Trade-offs

- Docker/registry availability and long frozen installs → explicit prerequisites, bounded waits and isolated cleanup; no success claim on failures.
- Retry backoff makes fault tests slow → accelerate only retry availability in disposable state, retaining eight-attempt production semantics.
- Shipping scans cannot establish a comprehensive security audit → document the exact surfaces/sentinels and keep Step 26 open.

## Migration Plan

No data migration. Add a new release acceptance command; retain existing acceptance modes. Prepare from a clean source revision, run acceptance, synchronize verified delta specs, archive and commit. Any product fix discovered must revise planning before implementation and trigger preparation of a fresh coherent set.
