import { afterEach, expect, test } from "vitest";
import { contentRepositoryContractCases } from "@lacecms/test-utils";
import { D1ContentRepository } from "../dist/index.js";
import { openLocalD1 } from "./d1-test-harness.mjs";

const cleanups = [];

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

const runtime = {
  async open(options) {
    const { database, dispose } = await openLocalD1();
    cleanups.push(async () => {
      try {
        expect(
          await database.prepare("select count(*) as count from mutation_guards").first(),
        ).toEqual({ count: 0 });
      } finally {
        await dispose();
      }
    });
    const bindAll = (sql, params) =>
      params.length === 0 ? database.prepare(sql) : database.prepare(sql).bind(...params);
    return {
      reopen: (overrides = {}) =>
        new D1ContentRepository(database, options.resolveModel, { ...options, ...overrides }),
      repository: new D1ContentRepository(database, options.resolveModel, options),
      sql: {
        all: async (sql, ...params) => (await bindAll(sql, params).all()).results,
        get: async (sql, ...params) => (await bindAll(sql, params).first()) ?? undefined,
        run: async (sql, ...params) => {
          await bindAll(sql, params).run();
        },
      },
    };
  },
};

for (const contract of contentRepositoryContractCases) {
  test(`local D1 contract: ${contract.name}`, () => contract.run(runtime, expect), 60_000);
}
