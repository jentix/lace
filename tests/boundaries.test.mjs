import { execFileSync, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const rootDirectory = join(testDirectory, "..");
const checker = join(rootDirectory, "scripts", "check-boundaries.mjs");
const fixtureDirectory = join(testDirectory, "fixtures", "boundaries");

test("allows an architecture-permitted public entry-point import", () => {
  expect(() =>
    execFileSync(process.execPath, [checker, join(fixtureDirectory, "allowed")], { stdio: "pipe" }),
  ).not.toThrow();
});

test("rejects a forbidden architecture import", () => {
  const result = spawnSync(process.execPath, [checker, join(fixtureDirectory, "forbidden")], {
    encoding: "utf8",
  });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("forbidden dependency");
});
