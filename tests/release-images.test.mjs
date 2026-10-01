import { expect, test } from "vitest";
import { imageBuildArguments, prepareImages } from "../scripts/release-images.mjs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const release = {
  version: "0.1.0-alpha.1",
  platforms: ["linux/amd64", "linux/arm64"],
  images: { api: "ghcr.io/lacecms/api" },
};
const source = { revision: "reviewed", fingerprint: "snapshot123456" };

test("image build is local, platform-specific and revision-pinned", () => {
  const args = imageBuildArguments("api", "linux/arm64", "local-tag", release, source, "/source");
  expect(args).toContain("--load");
  expect(args).not.toContain("--push");
  expect(args).toContain("LACE_REVISION=reviewed");
  expect(args).toContain("linux/arm64");
  expect(() =>
    imageBuildArguments("api", "linux/386", "tag", release, source, "/source"),
  ).toThrow();
});

test("failed image build and wrong platform do not produce artifact records", async () => {
  const root = await mkdtemp(join(tmpdir(), "lace-release-image-"));
  try {
    await expect(
      prepareImages("/source", root, release, source, ["linux/amd64"], async () => {
        throw new Error("platform build failed");
      }),
    ).rejects.toThrow("platform build failed");
    await rm(join(root, "images"), { recursive: true });
    await expect(
      prepareImages("/source", root, release, source, ["linux/amd64"], async (_, args) => {
        if (args[0] === "buildx") return "";
        return JSON.stringify([{ Os: "linux", Architecture: "arm64", Config: {} }]);
      }),
    ).rejects.toThrow("platform/version/source mismatch");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
