import { mkdtemp, mkdir, writeFile, rm, symlink, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, test } from "vitest";
import { validateSource, copySource } from "../dist/index.js";

const roots = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
async function fixture(siteDirectory = "site") {
  const root = await mkdtemp(join(tmpdir(), "lace-selection-"));
  roots.push(root);
  const source = join(root, "source");
  await mkdir(join(source, siteDirectory), { recursive: true });
  await writeFile(join(source, "package.json"), "{}");
  await writeFile(join(source, "pnpm-lock.yaml"), "lockfileVersion: '9.0'");
  if (siteDirectory !== ".")
    await writeFile(join(source, "pnpm-workspace.yaml"), `packages:\n  - ${siteDirectory}\n`);
  await writeFile(
    join(source, siteDirectory, "package.json"),
    JSON.stringify({ dependencies: { astro: "7.3.1" } }),
  );
  return { root, source, selection: { siteDirectory, outputDirectory: "dist" } };
}
test.each(["site", ".", "web/frontend"])("accepts explicit installation %s", async (site) => {
  const { source, selection } = await fixture(site);
  await expect(validateSource(source, selection)).resolves.toBeUndefined();
});
test.each([
  "/host/private",
  "../site",
  "web/../site",
  "web//site",
  "--root",
  "site\\other",
  "site\nother",
  "",
])("rejects unsafe selection %s", async (siteDirectory) => {
  const { source, selection } = await fixture();
  await expect(validateSource(source, { ...selection, siteDirectory })).rejects.toThrow();
  await expect(
    validateSource(source, { ...selection, outputDirectory: siteDirectory }),
  ).rejects.toThrow();
});
test("requires accessible regular lockfile and Astro package without nested installation", async () => {
  const { source, selection } = await fixture();
  await writeFile(join(source, "site/pnpm-lock.yaml"), "{}");
  await expect(validateSource(source, selection)).rejects.toThrow();
  await rm(join(source, "site/pnpm-lock.yaml"));
  await writeFile(join(source, "site/package.json"), "{}");
  await expect(validateSource(source, selection)).rejects.toThrow();
  await writeFile(
    join(source, "site/package.json"),
    JSON.stringify({ devDependencies: { astro: "7.3.1" } }),
  );
  await rm(join(source, "pnpm-lock.yaml"));
  await expect(validateSource(source, selection)).rejects.toThrow();
  await expect(validateSource(join(source, "absent"), selection)).rejects.toThrow();
});
test("rejects symbolic-link components and output overlapping source", async () => {
  const { source, selection } = await fixture();
  await symlink("site", join(source, "linked"));
  await expect(validateSource(source, { ...selection, siteDirectory: "linked" })).rejects.toThrow();
  await symlink("../site", join(source, "site/output"));
  await expect(
    validateSource(source, { ...selection, outputDirectory: "output" }),
  ).rejects.toThrow();
  await expect(
    validateSource(source, { ...selection, outputDirectory: "src/pages" }),
  ).rejects.toThrow();
});
test("copy excludes configured output and nested CMS data without changing source", async () => {
  const { root, source, selection } = await fixture();
  for (const file of [
    "site/release/index.html",
    "cms/.lace/data/lace.sqlite",
    "cms/.env",
    ".env.production",
    "node_modules/fake/index.js",
    "site/src/pages/index.astro",
  ]) {
    await mkdir(join(source, file, ".."), { recursive: true });
    await writeFile(join(source, file), "sentinel");
  }
  const destination = join(root, "copy");
  await copySource(source, destination, { ...selection, outputDirectory: "release" });
  for (const file of [
    "site/release/index.html",
    "cms/.lace/data/lace.sqlite",
    "cms/.env",
    ".env.production",
    "node_modules/fake/index.js",
  ]) {
    await expect(readFile(join(destination, file))).rejects.toThrow();
    expect(await readFile(join(source, file), "utf8")).toBe("sentinel");
  }
  expect(await readFile(join(destination, "site/src/pages/index.astro"), "utf8")).toBe("sentinel");
});
