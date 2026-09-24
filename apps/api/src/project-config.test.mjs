import { expect, test } from "vitest";
import { ConfigurationError, defineConfig, definePage } from "@lacecms/config";
import { loadProjectConfig } from "../dist/project-config.js";

test("loads the root configuration with typed home and posts models", async () => {
  const config = await loadProjectConfig();
  expect(config.public.content.map(({ key, kind, version }) => ({ key, kind, version }))).toEqual([
    { key: "home", kind: "page", version: 2 },
    { key: "posts", kind: "collection", version: 2 },
  ]);
  expect(config.runtime.blocks.get("hero")).toBeDefined();
  expect(config.public.content[1].route).toBe("/blog/:slug");
});

test("accepts a fresh normalized project configuration", async () => {
  const edited = await defineConfig({
    content: [definePage({ key: "about", path: "/about", version: 1 })],
  });
  const loaded = await loadProjectConfig(async () => ({ default: edited }));
  expect(loaded.public.content.map((model) => model.key)).toEqual(["about"]);
});

test("rejects a missing, invalid or failed project module without exposing raw failures", async () => {
  await expect(
    loadProjectConfig(async () => {
      throw new Error("secret-file-path");
    }),
  ).rejects.toThrow("Could not load lace.config.ts");
  await expect(
    loadProjectConfig(async () => {
      throw new ConfigurationError("model key is invalid");
    }),
  ).rejects.toThrow("Invalid lace.config.ts: model key is invalid");
  await expect(loadProjectConfig(async () => ({ default: {} }))).rejects.toThrow(
    "default export must be a normalized configuration",
  );
});
