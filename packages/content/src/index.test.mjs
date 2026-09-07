import { expect, test } from "vitest";
import { FieldConfigurationError, field, toFieldMetadata } from "../dist/index.js";

const fieldCases = [
  ["text", () => field.text({ defaultValue: "Lace" }), "text"],
  ["textarea", () => field.textarea({ defaultValue: "Lace" }), "textarea"],
  ["richText", () => field.richText({ defaultValue: { type: "doc" } }), "richText"],
  ["number", () => field.number({ defaultValue: 1 }), "number"],
  ["boolean", () => field.boolean({ defaultValue: true }), "boolean"],
  ["date", () => field.date({ defaultValue: "2026-09-07" }), "date"],
  ["datetime", () => field.datetime({ defaultValue: "2026-09-07T00:00:00.000Z" }), "datetime"],
  ["select", () => field.select({ defaultValue: "news", options: ["news"] }), "select"],
  ["url", () => field.url({ defaultValue: "https://lacecms.dev" }), "url"],
  ["media", () => field.media({ defaultValue: "01K4M0D3LQYH8ND26GG2DDC8N2" }), "media"],
];

test.each(fieldCases)("builds a %s descriptor", (_name, build, type) => {
  const definition = build();

  expect(definition).toMatchObject({ required: false, type });
  expect(Object.isFrozen(definition)).toBe(true);
});

test("normalizes common and type-specific options", () => {
  const text = field.text({
    defaultValue: "lace",
    description: "Visible heading",
    label: "Heading",
    maxLength: 10,
    minLength: 3,
    required: true,
  });
  const number = field.number({ defaultValue: 4, max: 5, min: 1 });
  const select = field.select({
    defaultValue: "design",
    options: ["design", "engineering"],
  });

  expect(text).toEqual({
    defaultValue: "lace",
    description: "Visible heading",
    label: "Heading",
    maxLength: 10,
    minLength: 3,
    required: true,
    type: "text",
  });
  expect(number).toEqual({ defaultValue: 4, max: 5, min: 1, required: false, type: "number" });
  expect(select).toEqual({
    defaultValue: "design",
    options: ["design", "engineering"],
    required: false,
    type: "select",
  });
});

test("detaches and freezes caller-provided options and rich-text defaults", () => {
  const selectSource = {
    options: ["design", "engineering"],
  };
  const richTextSource = {
    defaultValue: { content: [{ text: "before", type: "text" }], type: "doc" },
  };
  const definition = field.select(selectSource);
  const richText = field.richText(richTextSource);

  selectSource.options[0] = "changed";
  richTextSource.defaultValue.content[0].text = "after";

  expect(definition.options).toEqual(["design", "engineering"]);
  expect(richText.defaultValue).toEqual({
    content: [{ text: "before", type: "text" }],
    type: "doc",
  });
  expect(Object.isFrozen(definition.options)).toBe(true);
  expect(Object.isFrozen(richText.defaultValue.content)).toBe(true);
});

test("projects detached serializable form metadata", () => {
  const definition = field.text({ defaultValue: "Lace", label: "Title", minLength: 1 });
  const metadata = toFieldMetadata(definition);
  const roundTrip = JSON.parse(JSON.stringify(metadata));

  expect(metadata).toEqual(definition);
  expect(metadata).not.toBe(definition);
  expect(roundTrip).toEqual({
    defaultValue: "Lace",
    label: "Title",
    minLength: 1,
    required: false,
    type: "text",
  });
  expect(JSON.stringify(metadata)).not.toContain("function");
});

const invalidConfigurations = [
  ["function", () => field.text({ label: /** @type {string} */ (() => "bad") })],
  ["symbol", () => field.text({ label: /** @type {string} */ (Symbol("bad")) })],
  ["bigint", () => field.number({ min: /** @type {number} */ (1n) })],
  ["non-finite number", () => field.number({ min: Number.NaN })],
  ["host object", () => field.date({ defaultValue: /** @type {string} */ (new Date()) })],
  ["unknown option", () => field.boolean({ unsupported: true })],
  ["malformed common option", () => field.url({ required: /** @type {boolean} */ ("yes") })],
  ["malformed numeric option", () => field.number({ min: /** @type {number} */ ("1") })],
  ["duplicate select choice", () => field.select({ options: ["news", "news"] })],
  ["empty select choices", () => field.select({ options: /** @type {[string]} */ ([]) })],
  ["non-string select choice", () => field.select({ options: /** @type {[string]} */ ([1]) })],
  ["contradictory string bounds", () => field.text({ maxLength: 1, minLength: 2 })],
  ["contradictory numeric bounds", () => field.number({ max: 1, min: 2 })],
  ["negative string bound", () => field.text({ minLength: -1 })],
  ["fractional string bound", () => field.text({ maxLength: 1.5 })],
  ["wrong boolean default", () => field.boolean({ defaultValue: /** @type {boolean} */ ("true") })],
  ["wrong date default", () => field.date({ defaultValue: /** @type {string} */ (1) })],
  ["wrong rich-text default", () => field.richText({ defaultValue: /** @type {object} */ ([]) })],
  ["too-short text default", () => field.text({ defaultValue: "x", minLength: 2 })],
  ["out-of-bounds number default", () => field.number({ defaultValue: 6, max: 5 })],
  ["unknown select default", () => field.select({ defaultValue: "other", options: ["news"] })],
];

test.each(invalidConfigurations)("rejects %s", (_name, build) => {
  expect(build).toThrow(FieldConfigurationError);
  expect(build).toThrow(/options/u);
});

test("reports cyclic and sparse values with their option path", () => {
  const cyclic = { defaultValue: { type: "doc" } };
  cyclic.defaultValue.self = cyclic;
  const sparse = ["news"];
  sparse[2] = "design";

  expect(() => field.richText(cyclic)).toThrow(/options\.defaultValue\.self/u);
  expect(() => field.select({ options: sparse })).toThrow(/options\.options\[1\]/u);
});

test("rejects symbols and accessors without executing them", () => {
  const symbolOptions = { [Symbol("field")]: "value" };
  const accessorOptions = {};
  Object.defineProperty(accessorOptions, "label", {
    enumerable: true,
    get() {
      throw new Error("must not execute");
    },
  });

  expect(() => field.text(symbolOptions)).toThrow(/symbol/u);
  expect(() => field.text(accessorOptions)).toThrow(/accessor/u);
});
