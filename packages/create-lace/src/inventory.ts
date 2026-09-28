export type FileOwner = "managed" | "user";

export interface TemplateFile {
  readonly path: string;
  readonly owner: FileOwner;
  readonly cloudflare?: true;
  readonly interpolateName?: true;
}

export const TEMPLATE_VERSION = "0.1.0";

/** Every bundled template must appear here with an explicit ownership decision. */
export const TEMPLATE_FILES: readonly TemplateFile[] = [
  { path: ".env.example", owner: "managed" },
  { path: ".gitignore", owner: "managed" },
  { path: ".github/workflows/cloudflare.yml", owner: "managed", cloudflare: true },
  { path: "docker-compose.yml", owner: "managed" },
  { path: "lace.config.ts", owner: "user" },
  { path: "package.json", owner: "managed", interpolateName: true },
  { path: "pnpm-workspace.yaml", owner: "managed" },
  { path: "site/astro.config.mjs", owner: "user" },
  { path: "site/package.json", owner: "user", interpolateName: true },
  { path: "site/src/pages/index.astro", owner: "user" },
  { path: "site/src/pages/blog/[slug].astro", owner: "user" },
  { path: "site/src/styles/global.css", owner: "user" },
  { path: "site/tsconfig.json", owner: "user" },
  { path: "wrangler.jsonc", owner: "managed", cloudflare: true, interpolateName: true },
];
