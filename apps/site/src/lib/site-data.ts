import { createLaceClient, LaceHttpError, LaceTransportError } from "@lacecms/sdk";
import type { LaceFetch } from "@lacecms/sdk";
import fixtureExport from "../fixtures/published-export.json" with { type: "json" };

export const DEFAULT_API_BASE_URL = "https://cms.example.test/lace";

export type SiteEnvironment = Readonly<Record<string, string | undefined>>;

export interface SiteBlock {
  readonly data: Readonly<Record<string, unknown>>;
  readonly key: string;
  readonly position: number;
  readonly schemaVersion: number;
  readonly type: string;
}

interface ExportEntry {
  readonly entry: {
    readonly id: string;
    readonly model: { readonly key: string };
    readonly published?:
      | {
          readonly blocks: readonly SiteBlock[];
          readonly slug?: string | undefined;
          readonly title: string;
        }
      | undefined;
  };
  readonly path: string;
}

interface BuildExport {
  readonly entries: readonly ExportEntry[];
}

export interface SiteEntry {
  readonly blocks: readonly SiteBlock[];
  readonly id: string;
  readonly modelKey: string;
  readonly path: string;
  readonly slug?: string;
  readonly title: string;
}

export interface SiteData {
  readonly home: SiteEntry;
  readonly mediaUrl: (mediaId: string) => string;
  readonly posts: readonly SiteEntry[];
}

export interface SiteDataLoaderOptions {
  readonly environment?: SiteEnvironment;
  readonly fetch?: LaceFetch;
  readonly fixture?: unknown;
}

function toSiteEntry(value: ExportEntry): SiteEntry | undefined {
  const snapshot = value.entry.published;
  if (snapshot === undefined) return undefined;
  return {
    blocks: snapshot.blocks,
    id: value.entry.id,
    modelKey: value.entry.model.key,
    path: value.path,
    ...(snapshot.slug === undefined ? {} : { slug: snapshot.slug }),
    title: snapshot.title,
  };
}

function deriveSiteData(exported: BuildExport, mediaUrl: (mediaId: string) => string): SiteData {
  const entries = exported.entries.flatMap((entry) => {
    const published = toSiteEntry(entry);
    return published === undefined ? [] : [published];
  });
  const homes = entries.filter((entry) => entry.modelKey === "home" && entry.path === "/");
  if (homes.length !== 1 || homes[0] === undefined) {
    throw new TypeError(
      "The build export must contain exactly one published home entry at /. Run `pnpm content:sync`, then publish the home page in Admin.",
    );
  }
  const posts = entries.filter((entry) => {
    if (entry.modelKey !== "posts" || entry.slug === undefined) return false;
    return entry.path === `/blog/${entry.slug}`;
  });
  if (posts.length !== entries.filter((entry) => entry.modelKey === "posts").length) {
    throw new TypeError(
      "Every published post in the build export must have its canonical blog path.",
    );
  }
  const slugs = new Set<string>();
  for (const post of posts) {
    if (post.slug === undefined) throw new TypeError("Published post is missing a slug.");
    if (slugs.has(post.slug))
      throw new TypeError(`The build export contains duplicate post slug ${post.slug}.`);
    slugs.add(post.slug);
  }
  return {
    home: homes[0],
    mediaUrl,
    posts: [...posts].sort((left, right) => left.path.localeCompare(right.path)),
  };
}

function environmentFromProcess(): SiteEnvironment {
  return process.env;
}

async function loadFixtureExport(value: unknown, baseUrl: string): Promise<BuildExport> {
  const client = createLaceClient({
    baseUrl,
    fetch: async () =>
      new Response(JSON.stringify(value), { headers: { etag: '"0"' }, status: 200 }),
  });
  const result = await client.getBuildExport();
  if (!result.changed) throw new TypeError("The fixture export must contain published content.");
  return result.export;
}

async function loadExport(
  options: SiteDataLoaderOptions,
): Promise<{ exported: BuildExport; mediaBaseUrl: string }> {
  const environment = options.environment ?? environmentFromProcess();
  const mode = environment.LACE_SITE_DATA_MODE ?? "fixture";
  const baseUrl = environment.LACE_API_BASE_URL ?? DEFAULT_API_BASE_URL;
  const mediaBaseUrl = environment.LACE_PUBLIC_BASE_URL ?? baseUrl;
  if (mode === "fixture") {
    return {
      mediaBaseUrl,
      exported: await loadFixtureExport(options.fixture ?? fixtureExport, baseUrl),
    };
  }
  if (mode !== "live") throw new TypeError("LACE_SITE_DATA_MODE must be fixture or live.");
  if (
    environment.LACE_BUILD_TOKEN === undefined ||
    environment.LACE_BUILD_TOKEN.trim().length === 0
  ) {
    throw new TypeError(
      "LACE_BUILD_TOKEN is required in live mode. Create a read-only build token through POST /api/v1/admin/api-tokens, then set it in the ignored .env and restart the site.",
    );
  }
  if (environment.LACE_API_BASE_URL === undefined || environment.LACE_API_BASE_URL.length === 0)
    throw new TypeError(
      "LACE_API_BASE_URL is required in live mode; set it to the local API origin.",
    );
  const client = createLaceClient({
    baseUrl,
    ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
    token: environment.LACE_BUILD_TOKEN,
  });
  let result;
  try {
    result = await client.getBuildExport();
  } catch (error) {
    if (error instanceof LaceHttpError && (error.status === 401 || error.status === 403)) {
      throw new Error(
        "The local API rejected LACE_BUILD_TOKEN. Create or replace the read-only build token through POST /api/v1/admin/api-tokens, update the ignored .env, and restart the site.",
      );
    }
    if (error instanceof LaceTransportError) {
      throw new Error(
        "The local published-content API is unavailable. Check LACE_API_BASE_URL and that `pnpm dev:node` has started the API.",
      );
    }
    throw error;
  }
  if (!result.changed)
    throw new TypeError("A live build without an ETag must receive a build export.");
  return { mediaBaseUrl, exported: result.export };
}

export async function loadSiteData(options: SiteDataLoaderOptions = {}): Promise<SiteData> {
  const { mediaBaseUrl, exported } = await loadExport(options);
  const client = createLaceClient({ baseUrl: mediaBaseUrl });
  return deriveSiteData(exported, (mediaId) => client.getPublicMediaUrl(mediaId));
}

export function createSiteDataLoader(options: SiteDataLoaderOptions = {}): () => Promise<SiteData> {
  let siteData: Promise<SiteData> | undefined;
  return () => {
    siteData ??= loadSiteData(options).catch((error: unknown) => {
      siteData = undefined;
      throw error;
    });
    return siteData;
  };
}

export const getSiteData = createSiteDataLoader();
