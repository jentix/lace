import { expect, test } from "vitest";
import {
  formatListValue,
  listFieldColumns,
  sortFromSorting,
  sortingFromSort,
} from "./list-columns.js";

const model = {
  blocks: [],
  fields: {
    body: { required: false, type: "richText" as const },
    category: { label: "Category", options: ["news"], required: false, type: "select" as const },
    featured: { required: false, type: "boolean" as const },
  },
  key: "posts",
  kind: "collection" as const,
  listFields: ["category", "featured"],
  route: "/posts/:slug",
  version: 1,
};

test("list-field columns follow configuration order with label fallback", () => {
  expect(listFieldColumns(model).map(({ key, label }) => ({ key, label }))).toEqual([
    { key: "category", label: "Category" },
    { key: "featured", label: "featured" },
  ]);
  expect(listFieldColumns({ ...model, listFields: undefined } as never)).toEqual([]);
});

test("list values format by field type and fall back to a dash", () => {
  const field = (type: string) => ({ required: false, type }) as never;
  expect(formatListValue(field("boolean"), true)).toBe("Yes");
  expect(formatListValue(field("boolean"), false)).toBe("No");
  expect(formatListValue(field("number"), 12345.5)).toBe("12,345.5");
  expect(formatListValue(field("date"), "2026-09-20")).toBe("Sep 20, 2026");
  expect(formatListValue(field("datetime"), "2026-09-20T10:00:00.000Z")).toMatch(/2026/u);
  expect(formatListValue(field("select"), "news")).toBe("news");
  expect(formatListValue(field("text"), "Hello")).toBe("Hello");
  expect(formatListValue(field("textarea"), "Long text")).toBe("Long text");
  expect(formatListValue(field("url"), "https://lace.test")).toBe("https://lace.test");
  for (const type of ["boolean", "number", "date", "datetime", "select", "text"])
    expect(formatListValue(field(type), undefined)).toBe("—");
  expect(formatListValue(field("number"), "12")).toBe("—");
  expect(formatListValue(field("text"), "")).toBe("—");
  expect(formatListValue(field("date"), "not a date")).toBe("—");
});

test("sort values and sorting state convert both ways", () => {
  expect(sortingFromSort("-updatedAt")).toEqual({ desc: true, id: "updatedAt" });
  expect(sortingFromSort("title")).toEqual({ desc: false, id: "title" });
  expect(sortFromSorting("publishedAt", true)).toBe("-publishedAt");
  expect(sortFromSorting("title", false)).toBe("title");
});
