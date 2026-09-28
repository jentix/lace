import { readdir, readFile } from "node:fs/promises";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";

const migrationsDirectory = new URL("../../db/drizzle/", import.meta.url);

/** Checked-in forward migrations split into D1-executable statements. */
export async function migrationStatements() {
  const files = (await readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql")).sort();
  const statements = [];
  for (const file of files) {
    const sql = await readFile(new URL(file, migrationsDirectory), "utf8");
    statements.push(
      ...sql
        .split("--> statement-breakpoint")
        .map((statement) => statement.trim())
        .filter(Boolean),
    );
  }
  return statements;
}

/** Starts an isolated in-memory local D1 database with every migration applied. */
export async function openLocalD1() {
  const miniflare = new Miniflare(
    convertV4MiniflareOptions({
      compatibilityDate: "2026-09-01",
      d1Databases: ["DB"],
      modules: true,
      script: "export default { fetch() { return new Response(null, { status: 404 }); } };",
    }),
  );
  const database = await miniflare.getD1Database("DB");
  const statements = await migrationStatements();
  await database.batch(statements.map((statement) => database.prepare(statement)));
  return { database, dispose: () => miniflare.dispose() };
}

/** Counts queries and bound parameters issued through a D1 binding. */
export function countingD1(database) {
  const stats = { maxParameters: 0, queries: 0 };
  const wrap = (statement, parameters = 0) => ({
    all: () => {
      stats.queries += 1;
      return statement.all();
    },
    bind: (...values) => {
      stats.maxParameters = Math.max(stats.maxParameters, values.length);
      return wrap(statement.bind(...values), values.length);
    },
    first: () => {
      stats.queries += 1;
      return statement.first();
    },
    inner: statement,
    parameters,
    run: () => {
      stats.queries += 1;
      return statement.run();
    },
  });
  return {
    binding: {
      batch: (statements) => {
        stats.queries += statements.length;
        return database.batch(statements.map((statement) => statement.inner));
      },
      prepare: (sql) => wrap(database.prepare(sql)),
    },
    stats,
  };
}
