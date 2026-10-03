export type FileOwner = "managed" | "user";

export interface TemplateFile {
  readonly path: string;
  readonly owner: FileOwner;
  readonly cloudflare?: true;
  readonly interpolateName?: true;
  /** Reserved .lace metadata is delivered but never enters the upgrade file inventory. */
  readonly metadata?: true;
}

export const TEMPLATE_VERSION = "0.7.0";

/** Every bundled template must appear here with an explicit ownership decision. */
export const TEMPLATE_FILES: readonly TemplateFile[] = [
  { path: ".lace/upgrade-instructions.json", owner: "managed", metadata: true },
  { path: "README.md", owner: "user" },
  { path: ".env.example", owner: "managed" },
  { path: ".gitignore", owner: "managed" },
  { path: ".github/workflows/cloudflare.yml", owner: "managed", cloudflare: true },
  { path: "docker-compose.yml", owner: "managed" },
  { path: "deploy/minio.Dockerfile", owner: "managed" },
  { path: "deploy/nginx.conf", owner: "managed" },
  { path: "docs/lace-operations.md", owner: "managed" },
  { path: "lace.config.ts", owner: "user" },
  { path: "package.json", owner: "managed", interpolateName: true },
  { path: "pnpm-workspace.yaml", owner: "managed" },
  { path: "site/astro.config.mjs", owner: "user" },
  { path: "site/package.json", owner: "user", interpolateName: true },
  { path: "site/src/pages/index.astro", owner: "user" },
  { path: "site/src/pages/blog/[slug].astro", owner: "user" },
  { path: "site/src/components/RichTextBlock.astro", owner: "user" },
  { path: "site/src/components/BlockRenderer.astro", owner: "user" },
  { path: "site/src/components/CtaBlock.astro", owner: "user" },
  { path: "site/src/components/ImageBlock.astro", owner: "user" },
  { path: "site/src/components/RichTextNodes.astro", owner: "user" },
  { path: "site/src/components/RichText.astro", owner: "user" },
  { path: "site/src/components/HeroBlock.astro", owner: "user" },
  { path: "site/src/components/QuoteBlock.astro", owner: "user" },
  { path: "site/src/components/RichTextMarks.astro", owner: "user" },
  { path: "site/src/lib/rendering.ts", owner: "user" },
  { path: "site/src/lib/rich-text.ts", owner: "user" },
  { path: "site/src/layouts/BaseLayout.astro", owner: "user" },
  { path: "site/src/lib/site-data.ts", owner: "user" },
  { path: "site/src/styles/global.css", owner: "user" },
  { path: "site/tsconfig.json", owner: "user" },
  { path: "wrangler.jsonc", owner: "managed", cloudflare: true, interpolateName: true },
];
