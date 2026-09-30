## Context

See proposal.md for motivation. Generator staging/hash ownership is already verified. CLI migrate/sync/bootstrap work against project-local SQLite, and the API exposes POST /api/v1/setup/admin; Admin currently has login only. Reference Astro components implement five blocks, rich-text validation and data-lace styling. Generated Astro currently performs independent public page/collection reads and omits blocks. Compose builder currently uses its internal API URL for media too.

## Goals / Non-Goals

Goals: portable, source-independent generated rendering and accurate minimal local instructions. Preserve existing runtime/auth/storage contracts.
Non-goals: release manifests/coordinates, publishing, full consumer security gate, new auth UX or migration tools; those belong to later units.

## Decisions

1. Copy the verified reference components and rich-text/rendering helpers into explicitly user-owned template files. Use a small live-only site-data loader for home/posts, SDK validation, promise caching with failed-read eviction and builder expected-version checking. Do not ship fixture mode or extra reference routes. A package-owned renderer would undermine editable site ownership; per-page API requests lose export consistency.
2. Read build secrets only on the server through process environment or Astro's server-side environment. Keep the Vite public prefix restricted to LACE_PUBLIC_. LACE_API_BASE_URL controls transport; LACE_PUBLIC_BASE_URL controls media. Compose passes http://api:3000/ only for transport. Missing/rejected token and transport diagnostics must never echo credentials.
3. Retain explicit setup API use, documenting a server-side Node fetch script with secret prompts and no shell-history password. Existing CLI token output is the supported one-time disclosure; no new setup command or wizard is needed. Local scripts load root .env with Node --env-file for CLI commands. The initial API subset requires no dummy build token; the full builder requires a real token from Admin Settings.
4. Keep docs managed and rendering source user-owned; increment template version and update both generated snapshots. New generator consumers receive complete source; existing projects use guarded upgrade behavior and explicit user-owned instructions, never silent renderer overwrite.
5. Verify isolated generated Astro builds against a controlled published-export HTTP server (five blocks, rich text, path-prefix media, one request, rejected/missing token and unsupported blocks) and extend the existing packaged Compose journey just enough to consume authenticated export and verify browser media. Preserve broader 25C work separately.

## Risks / Trade-offs

- Copied rendering helpers can drift → compare template components/helpers with the verified reference and run generated HTML acceptance.
- Package/image coordinates remain placeholders until 25B → explicitly state prerequisites and verify with current repository acceptance artifacts only; do not claim publication readiness.
- Local cached data requires a dev-server restart after publication → document restart; each static build uses one fresh export.
- Populated-model structural edits are blocked → document sync --check and deliberate migration planning; no schema invariant changes.

## Migration Plan

No database or API migration. New generation includes the new starter. Managed Compose changes retain manifest conflict protection. Existing site source stays user-owned. Stop services without volumes deletion; revert generator commit to roll back templates without altering content.
