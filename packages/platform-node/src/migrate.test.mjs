import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, vi } from "vitest";
import { migrateNodeDatabase, openNodeDatabase } from "../dist/index.js";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, mkdirSync: vi.fn(actual.mkdirSync) };
});

test("explicit migration creates nested parents and preserves data on repeat", async () => {
  const root = await mkdtemp(join(tmpdir(), "lace-fresh-migrate-"));
  const path = join(root, "nested", "data", "lace.sqlite");
  try {
    const versions = migrateNodeDatabase(path);
    expect(versions.length).toBeGreaterThan(0);
    await writeFile(join(root, "nested", "data", "keep.txt"), "neighbour");
    const database = openNodeDatabase(path);
    try {
      database.connection
        .prepare(
          "insert into published_state (singleton_key, version, updated_at) values (1, 42, 0)",
        )
        .run();
    } finally {
      database.connection.close();
    }
    expect(migrateNodeDatabase(path)).toEqual(versions);
    const reopened = openNodeDatabase(path);
    try {
      expect(
        reopened.connection
          .prepare("select version from published_state where singleton_key = 1")
          .get(),
      ).toEqual({ version: 42 });
      expect(
        reopened.connection.prepare("select count(*) as count from __drizzle_migrations").get(),
      ).toEqual({ count: versions.length });
    } finally {
      reopened.connection.close();
    }
    expect(await readFile(join(root, "nested", "data", "keep.txt"), "utf8")).toBe("neighbour");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("memory migration never prepares directories", () => {
  vi.mocked(mkdirSync).mockClear();
  expect(migrateNodeDatabase(":memory:").length).toBeGreaterThan(0);
  expect(mkdirSync).not.toHaveBeenCalled();
});

test("blocked parent stops migration without changing existing files", async () => {
  const root = await mkdtemp(join(tmpdir(), "lace-blocked-migrate-"));
  const blocked = join(root, "blocked");
  try {
    await writeFile(blocked, "preserve me");
    expect(() => migrateNodeDatabase(join(blocked, "data/lace.sqlite"))).toThrow();
    expect(existsSync(join(blocked, "data/lace.sqlite"))).toBe(false);
    expect(await readFile(blocked, "utf8")).toBe("preserve me");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("parent created concurrently is accepted without replacement", async () => {
  const root = await mkdtemp(join(tmpdir(), "lace-race-migrate-"));
  const actual = await vi.importActual("node:fs");
  try {
    vi.mocked(mkdirSync).mockImplementationOnce((path, options) => {
      actual.mkdirSync(path, options);
      return actual.mkdirSync(path, options);
    });
    expect(migrateNodeDatabase(join(root, "nested/data/lace.sqlite")).length).toBeGreaterThan(0);
  } finally {
    vi.mocked(mkdirSync).mockImplementation(actual.mkdirSync);
    await rm(root, { recursive: true, force: true });
  }
});

test(
  "runtime executable resolves a fresh relative database from its working directory",
  { timeout: 30_000 },
  async () => {
    const root = await mkdtemp(join(tmpdir(), "lace-relative-migrate-"));
    try {
      const result = spawnSync(
        process.execPath,
        [fileURLToPath(new URL("../dist/migrate.js", import.meta.url))],
        {
          cwd: root,
          env: { ...process.env, LACE_DATABASE_PATH: "nested/data/lace.sqlite" },
          encoding: "utf8",
          // Bound the child separately, leaving time for assertions and cleanup.
          timeout: 25_000,
          killSignal: "SIGKILL",
        },
      );
      expect(result.error, result.error?.message ?? result.stderr).toBeUndefined();
      expect(result.status, result.stderr).toBe(0);
      expect(JSON.parse(result.stdout).length).toBeGreaterThan(0);
      expect(await readFile(join(root, "nested/data/lace.sqlite"))).toBeDefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
);
