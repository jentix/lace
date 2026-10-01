# create-lace

The Lace project generator. It creates editable Astro site source and typed content configuration without copying CMS engine or admin source into the project.

```bash
pnpm create lace my-site
# Equivalent executable form:
create-lace create my-site
```

To initialize an existing otherwise empty repository, run `create-lace init .` from its root. Only `.git`, `README.md`, and `LICENSE` may already exist. Add `--cloudflare` to either command to include a Cloudflare Pages config and manual deployment workflow. The Cloudflare option does not deploy the CMS Worker.

The generated `site/**` files and `lace.config.ts` belong to the project owner. Edit them to define models and design the public site. The root workspace files, `.env.example`, Docker Compose, and optional Cloudflare files are managed. `.lace/manifest.json` records the template version, file ownership, and SHA-256 of each managed file. It contains no credentials. It does not hash itself. Future `lace upgrade` work will use these digests to detect local edits.

Follow the generated `docs/lace-operations.md` from install and environment setup through explicit migration/sync, bootstrap and `POST /api/v1/setup/admin`, login, build-token creation, publication and Astro build. The alpha uses an explicit setup request; Admin has no setup wizard. Operator scripts load the root `.env`. The site includes user-owned renderers for all five built-in blocks, safe rich text and stable `data-lace-*` selectors, reading one authenticated published export per build. The Compose builder uses an internal API URL for exports and your browser-facing public URL for media.

The current repository has private `0.0.0` Lace packages and no final published image coordinates; Step 25B prepares coherent alpha artifacts, and 25C verifies them before publication. The repository acceptance command uses locally packed packages and built images. The generator itself requires no network or credentials. Configuration changes still use guarded sync; adding a model or custom block requires site-owned routes/renderers, and incompatible structural changes to populated models need deliberate migration planning.

Generation stages a complete tree beside the target. For an existing allowed directory, it briefly moves that directory to a sibling `.lace-backup-*` path and restores it if publication fails. If a filesystem error prevents cleanup or restoration, the command prints the exact staging or backup path. Inspect that path, move the backup to the original target if necessary, and remove leftover staging files only after confirming the target is intact.

For repository development:

```bash
pnpm --filter create-lace test
node packages/create-lace/dist/bin.js create /tmp/my-site
node scripts/generated-project-acceptance.mjs all
```
