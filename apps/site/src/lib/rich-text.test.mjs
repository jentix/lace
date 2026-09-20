import { expect, test } from "vitest";
import { assertSafeRichTextDocument } from "./rich-text.ts";

test("accepts every supported Tiptap node and mark structurally", () => {
  expect(() =>
    assertSafeRichTextDocument({
      content: [
        { attrs: { level: 2 }, content: [{ text: "Heading", type: "text" }], type: "heading" },
        {
          content: [
            {
              marks: [
                { type: "bold" },
                { type: "italic" },
                { type: "strike" },
                { type: "code" },
                { attrs: { href: "/safe" }, type: "link" },
              ],
              text: "Marked",
              type: "text",
            },
          ],
          type: "paragraph",
        },
        {
          content: [{ content: [{ text: "Bullet", type: "text" }], type: "listItem" }],
          type: "bulletList",
        },
        {
          content: [{ content: [{ text: "Number", type: "text" }], type: "listItem" }],
          type: "orderedList",
        },
        { content: [{ text: "Quote", type: "text" }], type: "blockquote" },
        { type: "hardBreak" },
      ],
      type: "doc",
    }),
  ).not.toThrow();
});

test("rejects unsafe rich-text nodes, attributes, and URLs before rendering", () => {
  expect(() =>
    assertSafeRichTextDocument({ content: [{ src: "x", type: "image" }], type: "doc" }),
  ).toThrow(/unsupported/u);
  expect(() =>
    assertSafeRichTextDocument({
      content: [{ attrs: { onclick: "alert(1)", level: 1 }, type: "heading" }],
      type: "doc",
    }),
  ).toThrow(/unsupported property/u);
  expect(() =>
    assertSafeRichTextDocument({
      content: [
        {
          content: [
            {
              marks: [{ attrs: { href: "javascript:alert(1)" }, type: "link" }],
              text: "bad",
              type: "text",
            },
          ],
          type: "paragraph",
        },
      ],
      type: "doc",
    }),
  ).toThrow(/allowed URL/u);
});
