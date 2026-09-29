import { expect, test, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runMigration } from "../dist/migrate.js";

test("Node migration is explicit and repeatable", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lace-cli-migrate-"));
  try {
    const databasePath = join(directory, "lace.sqlite");
    const first = await runMigration({ target: "node", databasePath });
    const second = await runMigration({ target: "node", databasePath });
    expect(first.length).toBeGreaterThan(0);
    expect(second).toEqual(first);
  } finally {
    await rm(directory, { recursive: true, force: true });
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
