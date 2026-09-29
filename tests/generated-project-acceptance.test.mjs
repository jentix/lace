import { spawnSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { expect, test } from "vitest";

test("acceptance runner redacts failed child output and cleans temporary state", async () => {
  const before = new Set(
    (await readdir(tmpdir())).filter((name) => name.startsWith("lace-generated-acceptance-")),
  );
  const secret = "test-secret-never-print-2357";
  const result = spawnSync("node", ["scripts/generated-project-acceptance.mjs", "self-test"], {
    encoding: "utf8",
    env: { ...process.env, LACE_ACCEPTANCE_SECRET_SENTINEL: secret },
  });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("forced-failure");
  expect(result.stderr).toContain("[REDACTED]");
  expect(`${result.stdout}${result.stderr}`).not.toContain(secret);
  const after = (await readdir(tmpdir())).filter((name) =>
    name.startsWith("lace-generated-acceptance-"),
  );
  expect(after.filter((name) => !before.has(name))).toEqual([]);
});
