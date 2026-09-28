import { afterAll, beforeAll, expect, test } from "vitest";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";

const run = promisify(execFile);
const appDirectory = fileURLToPath(new URL("..", import.meta.url));
const wrangler = join(appDirectory, "node_modules", ".bin", "wrangler");
const secret = "bundle-test-auth-secret-that-is-long-enough";
let directory;
let bundle;
let config;

/** Wrangler configuration is JSONC: whole-line comments and trailing commas only. */
function parseJsonc(text) {
  return JSON.parse(
    text
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n")
      .replace(/,(\s*[}\]])/gu, "$1"),
  );
}

beforeAll(async () => {
  config = parseJsonc(await readFile(join(appDirectory, "wrangler.jsonc"), "utf8"));
  directory = await mkdtemp(join(tmpdir(), "lace-worker-bundle-"));
  // Bundle the checked-in Worker with a stand-in assets directory so the admin build is optional.
  const assets = join(directory, "assets");
  await mkdir(assets);
  await writeFile(join(assets, "index.html"), "<!doctype html>");
  const configPath = join(directory, "wrangler.json");
  await writeFile(
    configPath,
    JSON.stringify({
      ...config,
      $schema: undefined,
      assets: { ...config.assets, directory: assets },
      d1_databases: config.d1_databases.map(
        ({ migrations_dir: _ignored, ...database }) => database,
      ),
      main: join(appDirectory, config.main),
    }),
  );
  const outdir = join(directory, "out");
  await run(wrangler, ["deploy", "--dry-run", "--config", configPath, "--outdir", outdir], {
    cwd: appDirectory,
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
  });
  bundle = await readFile(join(outdir, "index.js"), "utf8");
}, 120_000);

afterAll(async () => {
  if (directory !== undefined) await rm(directory, { force: true, recursive: true });
});

test("Worker configuration enables Better Auth compatibility and declares recovery bindings", () => {
  expect(config.compatibility_flags).toContain("nodejs_compat");
  expect(config.main).toBe("worker/index.ts");
  expect(config.d1_databases).toEqual([expect.objectContaining({ binding: "DB" })]);
  expect(config.r2_buckets).toEqual([expect.objectContaining({ binding: "MEDIA" })]);
  expect(config.assets).toMatchObject({ binding: "ASSETS", run_worker_first: true });
  expect(config.triggers.crons).toEqual(["* * * * *"]);
  expect(Object.keys(config.vars)).toEqual(["LACE_PUBLIC_BASE_URL"]);
});

test("Worker bundle contains no Node SQLite, S3, sharp, or filesystem module", () => {
  const bundledModules = [...bundle.matchAll(/^\/\/ (\S*node_modules\/\S+)$/gmu)].map(
    (match) => match[1],
  );
  expect(bundledModules.length).toBeGreaterThan(0);
  for (const path of bundledModules) {
    expect(path).not.toMatch(/node_modules\/(better-sqlite3|sharp|@aws-sdk\/[^/]+)\//u);
  }
  const specifiers = [
    ...bundle.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*)"([^"]+)"/gu),
  ].map((match) => match[1]);
  for (const specifier of specifiers) {
    expect(specifier).not.toMatch(
      /^(node:)?(fs|fs\/promises)$|^better-sqlite3$|^sharp$|^@aws-sdk\//u,
    );
  }
  expect(bundle).not.toContain(secret);
});

test("bundled Worker serves health and Better Auth routes under workerd", async () => {
  const miniflare = new Miniflare(
    convertV4MiniflareOptions({
      bindings: {
        LACE_AUTH_SECRET: secret,
        LACE_PUBLIC_BASE_URL: "http://localhost:8787/",
      },
      compatibilityDate: config.compatibility_date,
      compatibilityFlags: config.compatibility_flags,
      d1Databases: ["DB"],
      modules: true,
      r2Buckets: ["MEDIA"],
      script: bundle,
    }),
  );
  try {
    const live = await miniflare.dispatchFetch("http://localhost:8787/health/live");
    expect(live.status).toBe(200);
    expect(await live.json()).toEqual({ status: "live" });
    const ready = await miniflare.dispatchFetch("http://localhost:8787/health/ready");
    expect(await ready.json()).toEqual({ status: "ready" });
    const session = await miniflare.dispatchFetch("http://localhost:8787/api/auth/get-session");
    expect(session.status).toBe(200);
    expect(await session.json()).toBeNull();
    const unknown = await miniflare.dispatchFetch("http://localhost:8787/api/v1/unknown");
    expect(unknown.status).toBe(404);
  } finally {
    await miniflare.dispose();
  }
}, 60_000);
