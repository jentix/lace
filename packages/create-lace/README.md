# create-lace

The Lace project generator. It creates editable Astro site source and typed content configuration without copying CMS engine or admin source into the project.

```bash
pnpm create lace my-site
# Equivalent executable form:
create-lace create my-site
```

To initialize an existing otherwise empty repository, run `create-lace init .` from its root. Only `.git`, `README.md`, and `LICENSE` may already exist. Add `--cloudflare` to either command to include a Cloudflare Pages config and manual deployment workflow. The Cloudflare option does not deploy the CMS Worker.

The generated root `README.md`, `site/**` files and `lace.config.ts` belong to the project owner. Edit them to define models and design the public site. `init .` preserves any allowed existing README byte-for-byte, records it as user-owned without a digest, and prints an explicit fallback to `docs/lace-operations.md`; manually incorporate relevant setup text into your existing README if desired. A project generated in `cms/` gets its README and operations guide there. The root workspace files, `.env.example`, Docker Compose, operations guide and optional Cloudflare files are managed. `.lace/manifest.json` records the template version, file ownership, and SHA-256 of each managed file. It contains no credentials and does not hash itself. `lace upgrade` uses these digests to detect local edits and preserves user-owned README/source.

Start with the generated `README.md` and follow `docs/lace-operations.md` for detailed operation: install, `pnpm env:prepare`, setup-stage doctor, explicit migration/sync, bootstrap and `POST /api/v1/setup/admin`, login, build-token creation, publication and Astro build. Both guides include the same short placeholder-only curl request; the operations guide also provides private terminal input to avoid inline credentials in shell history. The alpha uses an explicit setup request; Admin has no setup wizard. Preparation creates a protected `.env` with random local service credentials, leaves the build token empty and refuses to overwrite existing configuration. Other operator scripts load the root `.env`. The site includes user-owned renderers for all five built-in blocks, safe rich text and stable `data-lace-*` selectors, reading one authenticated published export per build. The Compose builder uses an internal API URL for exports and your browser-facing public URL for media, and currently builds generated `site/` source.

The source ownership template is `0.6.0`, while package/image coordinates remain `0.1.0-alpha.1`. This quickstart requires a Step 27B generator and compatible current packages/images; previously published alpha artifacts are not retroactively updated. A coherent version/artifact refresh is separate release work. Repository acceptance uses locally packed packages and built images; registry availability is not implied. The generator itself requires no network or credentials. Configuration changes still use guarded sync; adding a model or custom block requires site-owned routes/renderers, and incompatible structural changes to populated models need deliberate migration planning. Browser setup, external-site builder selection and complete generated CMS Worker onboarding remain Steps 28–31 work.

Generation stages a complete tree beside the target. For an existing allowed directory, it briefly moves that directory to a sibling `.lace-backup-*` path and restores it if publication fails. If a filesystem error prevents cleanup or restoration, the command prints the exact staging or backup path. Inspect that path, move the backup to the original target if necessary, and remove leftover staging files only after confirming the target is intact.

For repository development:

```bash
pnpm --filter create-lace test
node packages/create-lace/dist/bin.js create /tmp/my-site
node scripts/generated-project-acceptance.mjs all
```
