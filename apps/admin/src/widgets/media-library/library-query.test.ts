import { expect, test } from "vitest";
import { normalizedMediaQuery } from "./library-query.js";

test("library queries drop blank and default values", () => {
  expect(
    normalizedMediaQuery({ q: "  ", sort: "-createdAt", type: undefined, view: undefined }),
  ).toStrictEqual({});
  expect(
    normalizedMediaQuery({ q: " hero ", sort: "size", type: "image/png", view: "list" }),
  ).toStrictEqual({ q: "hero", sort: "size", type: "image/png", view: "list" });
});
