import { expect, test } from "vitest";
import { field } from "@lacecms/content";
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
  await expect(defineConfig({ content: [homeModel(), homeModel()] })).rejects.toThrow(/share key/u);
  await expect(
    defineConfig({ content: [postModel(), postModel({ key: "articles", route: "/blog/:slug" })] }),
  ).rejects.toThrow(/share route/u);
  await expect(
    defineConfig({ content: [homeModel({ path: "/blog/releases" }), postModel()] }),
  ).rejects.toThrow(/collides/u);
  await expect(
    defineConfig({ content: [postModel(), postModel({ key: "articles", renamedFrom: "posts" })] }),
  ).rejects.toThrow(/renamedFrom/u);
  await expect(
    defineConfig({
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
  const first = await defineConfig({ content: [postModel(), homeModel()] });
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
  const second = await defineConfig({ content: [homeModel(), reorderedFields] });
  const displayChanged = await defineConfig({
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
    content: [homeModel({ version: 2 }), postModel()],
  });

  expect(first.structureHash).toBe(second.structureHash);
  expect(first.projectionHash).toBe(second.projectionHash);
  expect(first.content[0].key).toBe("home");
  expect(first.content[0].structureHash).toBe(displayChanged.content[0].structureHash);
  expect(first.content[0].projectionHash).not.toBe(displayChanged.content[0].projectionHash);
  expect(first.structureHash).not.toBe(structuralChanged.structureHash);
  expect(Object.isFrozen(first)).toBe(true);
  expect(Object.isFrozen(first.content)).toBe(true);
});
