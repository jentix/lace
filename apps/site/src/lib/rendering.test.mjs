import { expect, test } from "vitest";
import { assertRenderableBlock, readRequiredString } from "./rendering.ts";

const context = { entryId: "entry-1", key: "block-1", modelKey: "home" };

test("recognizes every built-in block type", () => {
  for (const type of ["hero", "richText", "image", "quote", "cta"]) {
    expect(() =>
      assertRenderableBlock(
        { data: {}, key: "block-1", position: 0, schemaVersion: 1, type },
        context,
      ),
    ).not.toThrow();
  }
});

test("reports model, entry, and block identifiers for unrenderable data", () => {
  expect(() =>
    assertRenderableBlock(
      { data: {}, key: "missing-renderer", position: 0, schemaVersion: 1, type: "unknown" },
      { entryId: "entry-7", key: "missing-renderer", modelKey: "posts" },
    ),
  ).toThrow(/missing-renderer.*model posts entry entry-7/u);
  expect(() =>
    readRequiredString(
      { data: {}, key: "block-1", position: 0, schemaVersion: 1, type: "hero" },
      context,
      "heading",
    ),
  ).toThrow(/block-1.*model home entry entry-1/u);
});
