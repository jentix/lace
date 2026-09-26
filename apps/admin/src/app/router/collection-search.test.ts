import { expect, test } from "vitest";
import { parseCollectionSearch } from "./collection-search.js";

test("keeps supported collection-list parameters", () => {
  expect(parseCollectionSearch({ q: "  launch ", sort: "title", status: "changed" })).toEqual({
    q: "launch",
    sort: "title",
    status: "changed",
  });
});

const none = { q: undefined, sort: undefined, status: undefined };

test("drops unsupported, blank, over-long, and default values", () => {
  expect(parseCollectionSearch({ sort: "author", status: "archived" })).toStrictEqual(none);
  expect(parseCollectionSearch({ q: "   " })).toStrictEqual(none);
  expect(parseCollectionSearch({ q: "x".repeat(201) })).toStrictEqual(none);
  expect(parseCollectionSearch({ q: 42, sort: "-updatedAt" })).toStrictEqual(none);
  expect(parseCollectionSearch({ q: "x".repeat(200) })).toStrictEqual({
    ...none,
    q: "x".repeat(200),
  });
});
