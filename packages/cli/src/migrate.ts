import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { D1Database } from "@lacecms/platform-cloudflare";
import { migrateNodeDatabase } from "@lacecms/platform-node";
import { CliError, EXIT, type Target } from "./index.js";

function parseJsonc(value: string): unknown {
  return JSON.parse(
    value
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n")
      .replace(/,(\s*[}\]])/gu, "$1"),
  );
}

export async function verifyD1Config(configPath: string, databaseId: string): Promise<void> {
  let config: unknown;
  try {
    config = parseJsonc(await readFile(configPath, "utf8"));
  } catch {
    throw new CliError("CONFIG", "Invalid LACE_WRANGLER_CONFIG.", EXIT.CONFIG);
  }
  const databases = (config as { d1_databases?: { binding?: string; database_id?: string }[] })
    .d1_databases;
  if (
    !Array.isArray(databases) ||
    databases.find((entry) => entry.binding === "DB")?.database_id !== databaseId
  )
    throw new CliError(
      "CONFIG",
      "LACE_D1_DATABASE_ID does not match LACE_WRANGLER_CONFIG DB binding.",
      EXIT.CONFIG,
    );
}

export interface MigrateInput {
  readonly target: Target;
  readonly databasePath?: string | undefined;
  readonly databaseId?: string | undefined;
  readonly persistTo?: string | undefined;
  readonly wranglerConfig?: string | undefined;
  readonly d1?: D1Database | undefined;
  readonly run?: typeof spawnSync;
}

export async function runMigration(input: MigrateInput): Promise<readonly string[]> {
  if (input.target === "node") {
    if (!input.databasePath)
      throw new CliError("CONFIG", "Missing LACE_DATABASE_PATH.", EXIT.CONFIG);
    return migrateNodeDatabase(input.databasePath).map((migration) => String(migration.createdAt));
  }
  if (
    !input.databaseId ||
    !input.wranglerConfig ||
    (input.target === "cloudflare-local" && !input.persistTo)
  )
    throw new CliError("CONFIG", "Missing D1 migration configuration.", EXIT.CONFIG);
  const configPath = resolve(input.wranglerConfig);
  await verifyD1Config(configPath, input.databaseId);
  const args = [
    "d1",
    "migrations",
    "apply",
    "DB",
    input.target === "cloudflare-local" ? "--local" : "--remote",
    "--config",
    configPath,
  ];
  if (input.target === "cloudflare-local")
    args.push("--persist-to", resolve(input.persistTo as string));
  const runner = input.run ?? spawnSync;
  const result = runner(resolve(dirname(configPath), "node_modules", ".bin", "wrangler"), args, {
    cwd: dirname(configPath),
    encoding: "utf8",
    env: { ...process.env, CI: "true", WRANGLER_SEND_METRICS: "false" },
  });
  if (result.error || result.status !== 0)
    throw new CliError(
      "OPERATION_FAILED",
      "D1 migration failed; inspect the configured Wrangler target and retry.",
      EXIT.OPERATION,
    );
  if (!input.d1) return [];
  const installed = await input.d1
    .prepare("select name from d1_migrations order by id")
    .all<{ name: string }>();
  return installed.results.map((row) => row.name);
}
