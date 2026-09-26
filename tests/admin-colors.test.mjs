import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { checkAdminColors } from "../scripts/check-admin-colors.mjs";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const checker = join(testDirectory, "..", "scripts", "check-admin-colors.mjs");
const fixtureDirectory = join(testDirectory, "fixtures", "admin-colors");

test("allows token utilities, non-color hashes, the theme file, and test files", () => {
  expect(checkAdminColors(join(fixtureDirectory, "allowed"))).toEqual([]);
});

test("reports every raw color literal with its file and line", () => {
  const source = join("apps", "admin", "src");
  expect(checkAdminColors(join(fixtureDirectory, "forbidden")).toSorted()).toEqual(
    [
      `${join(source, "Hex.tsx")}:2: raw color literal "#ff0000"`,
      `${join(source, "Inline.tsx")}:3: raw color literal "rgb("`,
      `${join(source, "Inline.tsx")}:3: raw color literal "white"`,
      `${join(source, "Palette.tsx")}:2: raw color literal "text-red-600"`,
      `${join(source, "styles.css")}:3: raw color literal "white"`,
      `${join(source, "styles.css")}:4: raw color literal "oklch("`,
    ].toSorted(),
  );
});

test("fails the command when a raw color literal is present", () => {
  const result = spawnSync(process.execPath, [checker, join(fixtureDirectory, "forbidden")], {
    encoding: "utf8",
  });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Hex.tsx:2: raw color literal "#ff0000"');
});

test("passes the command for the repository admin source", () => {
  const result = spawnSync(process.execPath, [checker], { encoding: "utf8" });
  expect(result.stderr).toBe("");
  expect(result.status).toBe(0);
});
