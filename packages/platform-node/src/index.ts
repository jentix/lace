import { appliedMigrationQuery } from "@lacecms/db";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

export const packageName = "@lacecms/platform-node";

export * from "./content-repository.js";
export * from "./runtime.js";

export interface NodeDatabase {
  readonly connection: Database.Database;
  readonly drizzle: ReturnType<typeof drizzle>;
}

export interface AppliedMigration {
  readonly createdAt: number;
  readonly hash: string;
}

/** Opens a Node SQLite connection with the required per-connection invariants. */
export function openNodeDatabase(databasePath: string): NodeDatabase {
  const connection = new Database(databasePath);
  connection.pragma("foreign_keys = ON");
  connection.pragma("journal_mode = WAL");
  return { connection, drizzle: drizzle(connection) };
}

const migrationFolder = fileURLToPath(new URL("../../db/drizzle", import.meta.url));

export function listAppliedMigrations(connection: Database.Database): readonly AppliedMigration[] {
  const records = connection.prepare(appliedMigrationQuery).all() as readonly {
    readonly created_at: number;
    readonly hash: string;
  }[];
  return records.map(({ created_at: createdAt, hash }) => ({ createdAt, hash }));
}

/** Applies checked-in forward migrations and returns their installed versions. */
export function migrateNodeDatabase(databasePath: string): readonly AppliedMigration[] {
  const database = openNodeDatabase(databasePath);
  try {
    migrate(database.drizzle, { migrationsFolder: migrationFolder });
    return listAppliedMigrations(database.connection);
  } finally {
    database.connection.close();
  }
}
