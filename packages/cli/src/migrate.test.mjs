import { expect, test, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runMigration } from "../dist/migrate.js";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

test("Node migration is explicit and repeatable", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lace-cli-migrate-"));
  try {
    const databasePath = join(directory, "nested", "data", "lace.sqlite");
    const first = await runMigration({ target: "node", databasePath });
    const second = await runMigration({ target: "node", databasePath });
    expect(first.length).toBeGreaterThan(0);
    expect(second).toEqual(first);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("CLI binary reports nested migration and sanitized directory failures", async () => {
  const root = await mkdtemp(join(tmpdir(), "lace-cli-fresh-"));
  const binary = fileURLToPath(new URL("../dist/bin.js", import.meta.url));
  const invoke = (path, json = true) =>
    spawnSync(process.execPath, [binary, "db", "migrate", ...(json ? ["--json"] : [])], {
      cwd: root,
      env: { ...process.env, LACE_DATABASE_PATH: path },
      encoding: "utf8",
    });
  try {
    const first = invoke("nested/data/lace.sqlite");
    expect(first.status, first.stderr).toBe(0);
    expect(JSON.parse(first.stdout)).toMatchObject({ ok: true, code: "MIGRATED" });
    expect(JSON.parse(invoke("nested/data/lace.sqlite").stdout)).toEqual(JSON.parse(first.stdout));
    const blocked = join(root, "private-secret-path");
    await writeFile(blocked, "unchanged");
    for (const json of [true, false]) {
      const failed = invoke(join(blocked, "data/lace.sqlite"), json);
      expect(failed.status).toBe(6);
      if (json) {
        expect(failed.stdout.trim().split("\n")).toHaveLength(1);
        expect(JSON.parse(failed.stdout)).toMatchObject({ ok: false, code: "OPERATION_FAILED" });
        expect(failed.stderr).toBe("");
      } else {
        expect(failed.stdout).toBe("");
        expect(failed.stderr).toContain("Operation failed.");
      }
      expect(failed.stdout + failed.stderr).not.toContain("private-secret-path");
      expect(existsSync(join(blocked, "data/lace.sqlite"))).toBe(false);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("D1 migration verifies selected database before invoking Wrangler", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lace-cli-wrangler-"));
  try {
    const wranglerConfig = join(directory, "wrangler.jsonc");
    await writeFile(
      wranglerConfig,
      '{ "d1_databases": [{ "binding": "DB", "database_id": "correct" }] }',
    );
    const run = vi.fn(() => ({ status: 0 }));
    const d1 = { prepare: () => ({ all: async () => ({ results: [{ name: "0000_init.sql" }] }) }) };
    await expect(
      runMigration({ target: "cloudflare-remote", databaseId: "wrong", wranglerConfig, d1, run }),
    ).rejects.toThrow("does not match");
    expect(run).not.toHaveBeenCalled();
    expect(
      await runMigration({
        target: "cloudflare-remote",
        databaseId: "correct",
        wranglerConfig,
        d1,
        run,
      }),
    ).toEqual(["0000_init.sql"]);
    expect(run.mock.calls[0][1]).toContain("--remote");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
