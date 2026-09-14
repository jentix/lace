import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { builtInBlocks, canonicalizeJson, field } from "@lacecms/content";
import fixtureConfig from "../dist/config.fixture.js";
import {
  ConfigurationError,
  defineCollection,
  defineConfig,
  definePage,
  normalizeCollectionRoute,
  normalizePagePath,
  packageName,
  resolveCollectionRoute,
} from "../dist/index.js";

const blocks = Object.values(builtInBlocks);

function postModel(overrides = {}) {
  return defineCollection({
    blocks: ["richText", "image"],
    fields: {
      author: field.text(),
      publishedAt: field.date({ required: true }),
    },
    key: "posts",
    label: "Posts",
    route: "/blog/:slug",
    version: 1,
    ...overrides,
  });
}

function homeModel(overrides = {}) {
  return definePage({
    blocks: ["hero"],
    fields: { heading: field.text({ label: "Heading", required: true }) },
    key: "home",
    label: "Home",
    path: "/",
    version: 1,
    ...overrides,
  });
}

test("exports its package identity", () => expect(packageName).toBe("@lacecms/config"));

test("defines deeply readonly page and collection models", () => {
  const fields = { heading: field.text({ label: "Original", required: true }) };
  const blocks = ["hero"];
  const page = definePage({
    blocks,
    fields,
    key: "home",
    path: "/",
    renamedFrom: "landing",
    version: 1,
  });
  const collection = postModel();

  fields.heading = field.text({ label: "Changed" });
  blocks[0] = "cta";

  expect(page).toMatchObject({
    blocks: ["hero"],
    key: "home",
    kind: "page",
    path: "/",
    renamedFrom: "landing",
    version: 1,
  });
  expect(page.fields.heading).toMatchObject({ label: "Original", required: true, type: "text" });
  expect(collection).toMatchObject({ key: "posts", kind: "collection", route: "/blog/:slug" });
  expect(Object.isFrozen(page)).toBe(true);
  expect(Object.isFrozen(page.fields)).toBe(true);
  expect(Object.isFrozen(page.blocks)).toBe(true);
});

test.each([
  ["invalid key", { key: "Posts" }],
  ["empty key", { key: "" }],
  ["zero version", { version: 0 }],
  ["fractional version", { version: 1.5 }],
  ["same former key", { renamedFrom: "home" }],
  ["invalid field key", { fields: { "bad-key": field.text() } }],
  ["duplicate blocks", { blocks: ["hero", "hero"] }],
])("rejects %s model metadata", (_name, overrides) => {
  expect(() => homeModel(overrides)).toThrow(ConfigurationError);
});

test("rejects duplicate identity and configuration-detectable routes", async () => {
  await expect(defineConfig({ blocks, content: [homeModel(), homeModel()] })).rejects.toThrow(
    /share key/u,
  );
  await expect(
    defineConfig({
      blocks,
      content: [postModel(), postModel({ key: "articles", route: "/blog/:slug" })],
    }),
  ).rejects.toThrow(/share route/u);
  await expect(
    defineConfig({ blocks, content: [homeModel({ path: "/blog/releases" }), postModel()] }),
  ).rejects.toThrow(/collides/u);
  await expect(
    defineConfig({
      blocks,
      content: [postModel(), postModel({ key: "articles", renamedFrom: "posts" })],
    }),
  ).rejects.toThrow(/renamedFrom/u);
  await expect(
    defineConfig({
      blocks,
      content: [homeModel({ renamedFrom: "landing" }), postModel({ renamedFrom: "landing" })],
    }),
  ).rejects.toThrow(/share renamedFrom/u);
});

test("normalizes only canonical page and collection routes", () => {
  expect(normalizePagePath("/")).toBe("/");
  expect(normalizePagePath("/about")).toBe("/about");
  expect(normalizeCollectionRoute("/blog/:slug")).toBe("/blog/:slug");
  expect(resolveCollectionRoute("/blog/:slug", "release-notes")).toBe("/blog/release-notes");

  for (const value of [
    "about",
    "/about/",
    "/about//team",
    "/about/./team",
    "/about/../team",
    "/about?tab=1",
    "/about#team",
    "/:slug",
  ]) {
    expect(() => normalizePagePath(value)).toThrow(ConfigurationError);
  }
  for (const value of [
    "/blog",
    "/blog/:slug/:slug",
    "/blog/:id",
    "/blog/:slug/",
    "/blog//:slug",
    "/blog/:slug?draft=1",
  ]) {
    expect(() => normalizeCollectionRoute(value)).toThrow(ConfigurationError);
  }
  for (const slug of [
    "Release",
    "release/notes",
    "release--notes",
    "",
    "release?draft=1",
    "release#notes",
    ".",
  ]) {
    expect(() => resolveCollectionRoute("/blog/:slug", slug)).toThrow(ConfigurationError);
  }
});

test("produces stable per-model and whole-config hashes", async () => {
  const first = await defineConfig({ blocks, content: [postModel(), homeModel()] });
  const reorderedFields = defineCollection({
    blocks: ["richText", "image"],
    fields: {
      publishedAt: field.date({ required: true }),
      author: field.text(),
    },
    key: "posts",
    label: "Posts",
    route: "/blog/:slug",
    version: 1,
  });
  const second = await defineConfig({ blocks, content: [homeModel(), reorderedFields] });
  const displayChanged = await defineConfig({
    blocks,
    content: [
      definePage({
        blocks: ["hero"],
        fields: { heading: field.text({ label: "Title", required: true }) },
        key: "home",
        label: "Homepage",
        path: "/",
        version: 1,
      }),
      postModel(),
    ],
  });
  const structuralChanged = await defineConfig({
    blocks,
    content: [homeModel({ version: 2 }), postModel()],
  });
  const renamed = await defineConfig({
    blocks,
    content: [homeModel(), postModel({ renamedFrom: "articles" })],
  });

  expect(first.structureHash).toBe(second.structureHash);
  expect(first.projectionHash).toBe(second.projectionHash);
  expect(first.content[0].key).toBe("home");
  expect(first.content[0].structureHash).toBe(displayChanged.content[0].structureHash);
  expect(first.content[0].projectionHash).not.toBe(displayChanged.content[0].projectionHash);
  expect(first.structureHash).not.toBe(structuralChanged.structureHash);
  expect(first.projectionHash).toBe(renamed.projectionHash);
  expect(first.structureHash).toBe(renamed.structureHash);
  expect(first.content[1].projectionHash).toBe(renamed.content[1].projectionHash);
  expect(first.content[1].structureHash).toBe(renamed.content[1].structureHash);
  expect(renamed.content[1]).not.toHaveProperty("renamedFrom");
  expect(renamed.public.content[1]).not.toHaveProperty("renamedFrom");
  expect(renamed.runtime.content[1]).toMatchObject({ renamedFrom: "articles" });
  expect(Object.isFrozen(first)).toBe(true);
  expect(Object.isFrozen(first.content)).toBe(true);
});

test("rejects model blocks missing from the root registry and separates projections", async () => {
  await expect(defineConfig({ blocks: [], content: [homeModel()] })).rejects.toThrow(
    /unregistered/u,
  );

  const config = await defineConfig({ blocks, content: [homeModel(), postModel()] });
  expect(config.public).toEqual({
    blocks: config.blocks,
    content: config.content,
    projectionHash: config.projectionHash,
    structureHash: config.structureHash,
  });
  expect(JSON.stringify(config.public)).not.toContain("validate");
  expect(config.runtime.blocks.get("hero")?.validate({ heading: "Lace" }, "publish")).toEqual({
    heading: "Lace",
  });
});

test("snapshots the architecture root fixture's canonical public projection", () => {
  const expected = JSON.parse(
    readFileSync(new URL("./config.projection.fixture.json", import.meta.url), "utf8"),
  );
  expect(canonicalizeJson(fixtureConfig.public)).toBe(canonicalizeJson(expected));
});
