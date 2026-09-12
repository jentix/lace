import { expect, test } from "vitest";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  listAppliedMigrations,
  migrateNodeDatabase,
  openNodeDatabase,
  packageName,
} from "../dist/index.js";

test("exports its package identity", () => expect(packageName).toBe("@lacecms/platform-node"));

test("migrates an empty file, reopens with SQLite invariants, and enforces constraints", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lace-schema-"));
  const databasePath = join(directory, "lace.sqlite");
  try {
    expect(migrateNodeDatabase(databasePath)).toHaveLength(1);
    const database = openNodeDatabase(databasePath);
    try {
      expect(database.connection.pragma("foreign_keys", { simple: true })).toBe(1);
      expect(database.connection.pragma("journal_mode", { simple: true })).toBe("wal");
      expect(listAppliedMigrations(database.connection)).toHaveLength(1);

      const tableNames = database.connection
        .prepare("select name from sqlite_master where type = 'table'")
        .all()
        .map(({ name }) => name);
      expect(tableNames).toEqual(
        expect.arrayContaining([
          "content_models",
          "content_entries",
          "content_snapshots",
          "outbox_events",
          "installation_state",
          "user",
        ]),
      );
      const indexNames = database.connection
        .prepare("select name from sqlite_master where type = 'index'")
        .all()
        .map(({ name }) => name);
      expect(indexNames).toEqual(
        expect.arrayContaining([
          "content_entries_singleton_idx",
          "content_entries_list_idx",
          "content_blocks_snapshot_position_idx",
          "content_media_references_media_idx",
          "outbox_events_available_idx",
          "site_builds_history_idx",
        ]),
      );

      const insertModel = database.connection.prepare(
        "insert into content_models values (?, ?, ?, ?, ?, ?, ?, ?)",
      );
      insertModel.run("home", "page", "Home", 1, "structure", "projection", 1, 1);
      expect(() =>
        insertModel.run("invalid", "unsupported", "Invalid", 1, "structure", "projection", 1, 1),
      ).toThrow();
      const insertEntry = database.connection.prepare(
        "insert into content_entries (id, model_key, singleton_key, created_by, created_at, updated_at) values (?, ?, ?, ?, ?, ?)",
      );
      insertEntry.run("home-1", "home", 1, "admin", 1, 1);
      expect(() => insertEntry.run("home-2", "home", 1, "admin", 1, 1)).toThrow();
      expect(() =>
        database.connection
          .prepare("insert into content_blocks values (?, ?, ?, ?, ?, ?, ?, ?)")
          .run("missing", "block", "hero", 1000, 1, "{}", 1, 1),
      ).toThrow();

      expect(() =>
        database.connection
          .prepare(
            "insert into media (id, storage_key, filename, mime_type, size, metadata_json, status, created_by, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          )
          .run(
            "invalid-media",
            "object-invalid",
            "image.png",
            "image/png",
            1,
            "{}",
            "missing",
            "admin",
            1,
            1,
          ),
      ).toThrow();
      expect(() =>
        database.connection.prepare("insert into published_state values (?, ?, ?)").run(2, 0, 1),
      ).toThrow();
      expect(() =>
        database.connection
          .prepare(
            "insert into site_builds (id, reason, status, target_version, requested_by, requested_at) values (?, ?, ?, ?, ?, ?)",
          )
          .run("invalid-build", "manual", "unknown", 0, "admin", 1),
      ).toThrow();

      insertModel.run("posts", "collection", "Posts", 1, "structure", "projection", 1, 1);
      insertEntry.run("post-1", "posts", null, "admin", 1, 1);
      insertEntry.run("post-2", "posts", null, "admin", 1, 1);
      const insertSnapshot = database.connection.prepare(
        "insert into content_snapshots values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      );
      insertSnapshot.run("post-1-draft", "post-1", 1, null, "First", "{}", 1, 1, 1, "admin");
      insertSnapshot.run("post-2-draft", "post-2", 1, null, "Second", "{}", 1, 1, 1, "admin");
      database.connection
        .prepare("update content_entries set draft_snapshot_id = ? where id = ?")
        .run("post-1-draft", "post-1");
      database.connection
        .prepare("insert into published_routes values (?, ?, ?, ?)")
        .run("/posts/first", "post-1", "post-1-draft", 1);
      expect(() =>
        database.connection
          .prepare("insert into published_routes values (?, ?, ?, ?)")
          .run("/posts/first", "post-2", "post-2-draft", 1),
      ).toThrow();
      const insertIdempotency = database.connection.prepare(
        "insert into idempotency_records values (?, ?, ?, ?, ?, ?)",
      );
      insertIdempotency.run("publication:post-1", "request-1", "hash", "{}", 1, 2);
      expect(() =>
        insertIdempotency.run("publication:post-1", "request-1", "different", "{}", 1, 2),
      ).toThrow();

      database.connection
        .prepare(
          "insert into media (id, storage_key, filename, mime_type, size, metadata_json, status, created_by, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .run("media-1", "object-1", "image.png", "image/png", 1, "{}", "active", "admin", 1, 1);
      database.connection
        .prepare("insert into content_media_references values (?, ?, ?, ?, ?)")
        .run("post-1-draft", "$fields", "image", "media-1", 1);
      expect(() =>
        database.connection.prepare("delete from media where id = ?").run("media-1"),
      ).toThrow();

      database.connection
        .prepare("update content_models set key = ? where key = ?")
        .run("articles", "posts");
      expect(
        database.connection
          .prepare("select model_key from content_entries where id = ?")
          .get("post-1"),
      ).toEqual({ model_key: "articles" });
      expect(() =>
        database.connection.prepare("delete from content_models where key = ?").run("articles"),
      ).toThrow();

      database.connection.prepare("delete from content_snapshots where id = ?").run("post-1-draft");
      expect(
        database.connection
          .prepare("select draft_snapshot_id from content_entries where id = ?")
          .get("post-1"),
      ).toEqual({ draft_snapshot_id: null });
      expect(
        database.connection.prepare("select count(*) as count from content_media_references").get(),
      ).toEqual({ count: 0 });
      database.connection.prepare("delete from media where id = ?").run("media-1");

      database.connection
        .prepare("insert into content_blocks values (?, ?, ?, ?, ?, ?, ?, ?)")
        .run("post-2-draft", "block-1", "hero", 1000, 1, "{}", 1, 1);
      database.connection.prepare("delete from content_entries where id = ?").run("post-2");
      expect(
        database.connection.prepare("select count(*) as count from content_blocks").get(),
      ).toEqual({
        count: 0,
      });
    } finally {
      database.connection.close();
    }

    const migrationFile = (await readdir(new URL("../../db/drizzle", import.meta.url))).find(
      (file) => file.endsWith(".sql"),
    );
    expect(migrationFile).toBeDefined();
    const migrationSql = await readFile(
      new URL(`../../db/drizzle/${migrationFile}`, import.meta.url),
      "utf8",
    );
    expect(migrationSql).not.toContain("journal_mode");
    expect(migrationSql).not.toContain("foreign_keys = ON");
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});
