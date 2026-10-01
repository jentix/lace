import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import {
  claimOutput,
  completeInventory,
  inspectPackage,
  safeSourcePath,
  snapshotSource,
} from "../scripts/release-artifacts.mjs";
import { readJson } from "../scripts/release-model.mjs";
import { prepareRelease } from "../scripts/release.mjs";

test("clean snapshots are stable, dirty inputs require an explicit preview", async () => {
  const parent = await mkdtemp(join(tmpdir(), "lace-release-source-"));
  try {
    const root = join(parent, "source");
    await mkdir(root);
    const git = (...args) => execFileSync("git", args, { cwd: root, stdio: "pipe" });
    git("init");
    git("config", "user.name", "Release test");
    git("config", "user.email", "release@lace.test");
    await writeFile(join(root, "file.txt"), "reviewed");
    git("add", ".");
    git("commit", "-m", "fixture");
    const clean = await snapshotSource(root, join(parent, "clean"), false);
    expect(clean.preview).toBe(false);
    await writeFile(join(root, "file.txt"), "changed");
    await expect(snapshotSource(root, join(parent, "rejected"), false)).rejects.toThrow(
      "clean Git",
    );
    const preview = await snapshotSource(root, join(parent, "preview"), true);
    expect(preview.preview).toBe(true);
    expect(preview.revision).toBe(clean.revision);
    expect(preview.fingerprint).not.toBe(clean.fingerprint);
    expect(await readFile(join(parent, "preview/file.txt"), "utf8")).toBe("changed");
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("output claims refuse concurrent reuse and begin incomplete", async () => {
  const parent = await mkdtemp(join(tmpdir(), "lace-release-output-"));
  try {
    const destination = join(parent, "artifacts");
    const results = await Promise.allSettled([claimOutput(destination), claimOutput(destination)]);
    expect(results.filter((item) => item.status === "fulfilled")).toHaveLength(1);
    expect(await readJson(join(destination, "status.json"))).toEqual({ state: "preparing" });
    await expect(readFile(join(destination, "inventory.json"))).rejects.toThrow();
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("injected preparation failure leaves no inventory or success", async () => {
  const parent = await mkdtemp(join(tmpdir(), "lace-release-failure-"));
  const output = join(parent, "failed");
  try {
    await expect(
      prepareRelease(
        { root: new URL("..", import.meta.url).pathname, output, phase: "packages", preview: true },
        {
          packages: async () => {
            throw new Error("injected pack failure");
          },
        },
      ),
    ).rejects.toThrow("injected pack failure");
    expect((await readJson(join(output, "status.json"))).state).toBe("failed");
    await expect(readFile(join(output, "inventory.json"))).rejects.toThrow();
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("incomplete and dirty previews cannot claim publication eligibility", () => {
  const release = {
    packages: ["content"],
    images: { api: "image" },
    platforms: ["linux/amd64", "linux/arm64"],
  };
  const packages = [{ name: "@lacecms/content" }];
  const images = release.platforms.map((platform) => ({
    kind: "api",
    platform,
    smokePassed: true,
  }));
  expect(completeInventory(release, { preview: false }, packages, images).publicationEligible).toBe(
    true,
  );
  expect(completeInventory(release, { preview: true }, packages, images).publicationEligible).toBe(
    false,
  );
  expect(completeInventory(release, { preview: false }, packages, images.slice(1)).complete).toBe(
    false,
  );
  expect(completeInventory(release, { preview: false }, [], images).complete).toBe(false);
  expect(completeInventory(release, { preview: false }, [{ name: "wrong" }], images).complete).toBe(
    false,
  );
  expect(
    completeInventory(
      release,
      { preview: false },
      packages,
      images.map((item) => ({ ...item, smokePassed: false })),
    ).complete,
  ).toBe(false);
});

test("credentials, data and traversal cannot enter snapshots", () => {
  for (const path of [
    ".env",
    ".npmrc",
    "../escape",
    "/escape",
    ".aws/credentials",
    "data.sqlite",
    "node_modules/file",
    "apps/admin/dist/index.html",
  ])
    expect(safeSourcePath(path)).toBe(false);
  expect(safeSourcePath("packages/create-lace/templates/.env.example")).toBe(true);
});

test("archive verification rejects missing exports and forbidden files", async () => {
  const root = await mkdtemp(join(tmpdir(), "lace-release-archive-"));
  try {
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({
        name: "@lacecms/content",
        version: "0.1.0-alpha.1",
        exports: { ".": { import: "./dist/index.js" } },
      }),
    );
    const release = { version: "0.1.0-alpha.1", packages: ["content"] };
    await expect(inspectPackage(root, release)).rejects.toThrow("Missing archive entry point");
    await mkdir(join(root, "dist"));
    await writeFile(join(root, "dist/index.js"), "export {};");
    await expect(inspectPackage(root, release)).resolves.toMatchObject({
      name: "@lacecms/content",
    });
    await writeFile(join(root, ".env"), "SECRET=fixture");
    await expect(inspectPackage(root, release)).rejects.toThrow("Forbidden archive file");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
