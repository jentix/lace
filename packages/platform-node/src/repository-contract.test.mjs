import { afterEach, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { contentRepositoryContractCases } from "@lacecms/test-utils";
import { NodeContentRepository, migrateNodeDatabase, openNodeDatabase } from "../dist/index.js";

const migrationsFolder = fileURLToPath(new URL("../../db/drizzle", import.meta.url));
const cleanups = [];

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

function sqlOver(connection) {
  return {
    all: async (sql, ...params) => connection.prepare(sql).all(...params),
    get: async (sql, ...params) => connection.prepare(sql).get(...params),
    run: async (sql, ...params) => {
      connection.prepare(sql).run(...params);
    },
  };
}

function trackGuards(connection) {
  cleanups.push(async () => {
    expect(connection.prepare("select count(*) as count from mutation_guards").get()).toEqual({
      count: 0,
    });
  });
}

const runtimes = {
  "file-backed SQLite": {
    async open(options) {
      const directory = await mkdtemp(join(tmpdir(), "lace-contract-"));
      const databasePath = join(directory, "lace.sqlite");
      migrateNodeDatabase(databasePath);
      const connections = [];
      const connect = () => {
        const { connection } = openNodeDatabase(databasePath);
        connections.push(connection);
        return connection;
      };
      const connection = connect();
      cleanups.push(async () => {
        for (const value of connections) value.close();
        await rm(directory, { force: true, recursive: true });
      });
      trackGuards(connection);
      return {
        reopen: (overrides = {}) =>
          new NodeContentRepository(connect(), options.resolveModel, { ...options, ...overrides }),
        repository: new NodeContentRepository(connection, options.resolveModel, options),
        sql: sqlOver(connection),
      };
    },
  },
  "in-memory SQLite": {
    async open(options) {
      const database = openNodeDatabase(":memory:");
      migrate(database.drizzle, { migrationsFolder });
      cleanups.push(async () => database.connection.close());
      trackGuards(database.connection);
      return {
        reopen: (overrides = {}) =>
          new NodeContentRepository(database.connection, options.resolveModel, {
            ...options,
            ...overrides,
          }),
        repository: new NodeContentRepository(database.connection, options.resolveModel, options),
        sql: sqlOver(database.connection),
      };
    },
  },
};

for (const [runtimeName, runtime] of Object.entries(runtimes)) {
  for (const contract of contentRepositoryContractCases) {
    test(`${runtimeName} contract: ${contract.name}`, () => contract.run(runtime, expect));
  }
}
