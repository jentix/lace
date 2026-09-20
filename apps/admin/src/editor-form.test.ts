import { describe, expect, test } from "vitest";
import type { ContentModelDto } from "@lacecms/contracts";
import {
  initialModelFieldValues,
  pointerToFormField,
  suggestSlug,
  validateDraftValues,
} from "./editor-form.js";

const model = {
  blocks: [],
  fields: {
    enabled: { defaultValue: false, required: false, type: "boolean" },
    score: { max: 5, min: 1, required: true, type: "number" },
    status: { options: ["draft", "live"], required: false, type: "select" },
    url: { required: false, type: "url" },
  },
  key: "posts",
  kind: "collection" as const,
  route: "/posts/:slug",
  version: 1,
} satisfies ContentModelDto;

describe("metadata-driven draft validation", () => {
  test("uses portable field rules and preserves draft-required optionality", async () => {
    expect(
      validateDraftValues(model, {
        blocks: [],
        fields: { score: 6, status: "other", url: "javascript:alert(1)" },
        title: "",
      }),
    ).toMatchObject({ fields: { score: {}, status: {}, url: {} }, title: {} });
    expect(validateDraftValues(model, { blocks: [], fields: {}, title: "Draft" })).toEqual({});
  });

  test("accepts draft values for every portable descriptor variant", () => {
    const allFieldsModel = {
      blocks: [],
      fields: {
        active: { required: false, type: "boolean" },
        amount: { required: false, type: "number" },
        body: { required: false, type: "textarea" },
        date: { required: false, type: "date" },
        datetime: { required: false, type: "datetime" },
        hero: { required: false, type: "media" },
        link: { required: false, type: "url" },
        richBody: { required: false, type: "richText" },
        section: { options: ["news"], required: false, type: "select" },
        title: { required: false, type: "text" },
      },
      key: "posts",
      kind: "collection" as const,
      route: "/posts/:slug",
      version: 1,
    } satisfies ContentModelDto;

    expect(
      validateDraftValues(allFieldsModel, {
        blocks: [],
        fields: {
          active: false,
          amount: 3,
          body: "A paragraph",
          date: "2026-02-28",
          datetime: "2026-09-20T12:00:00.000Z",
          hero: "01K4M0D3LQYH8ND26GG2DDC8N2",
          link: "/about",
          richBody: {
            content: [{ content: [{ text: "Lace", type: "text" }], type: "paragraph" }],
            type: "doc",
          },
          section: "news",
          title: "Hello",
        },
        title: "Draft",
      }),
    ).toEqual({});
  });

  test("applies field defaults and maps only safe server error paths", () => {
    expect(initialModelFieldValues(model, {})).toMatchObject({ enabled: false });
    expect(pointerToFormField("/fields/status")).toBe("fields.status");
    expect(pointerToFormField("/blocks/0/data/title")).toBeUndefined();
  });

  test("suggests a stable collection slug", () => {
    expect(suggestSlug("  Crème brûlée — Launch! ")).toBe("creme-brulee-launch");
  });
});
