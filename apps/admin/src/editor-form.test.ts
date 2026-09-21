import { describe, expect, test } from "vitest";
import type { ContentModelDto } from "@lacecms/contracts";
import {
  initialModelFieldValues,
  isUlid,
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

  test("validates local block metadata and maps only its current block paths", () => {
    const blockModel = {
      blockDefinitions: [
        {
          fields: { actionUrl: { required: false, type: "url" } },
          type: "cta",
          version: 1,
        },
      ],
      blocks: ["cta"],
      fields: {},
      key: "posts",
      kind: "collection" as const,
      route: "/posts/:slug",
      version: 1,
    } satisfies ContentModelDto;
    const block = {
      data: { actionUrl: "javascript:alert(1)" },
      key: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      position: 1_000,
      schemaVersion: 1,
      type: "cta",
    };
    expect(isUlid(block.key)).toBe(true);
    expect(
      validateDraftValues(blockModel, { blocks: [block], fields: {}, title: "Post" }),
    ).toMatchObject({
      blocks: { 0: { data: { actionUrl: {} } } },
    });
    expect(pointerToFormField("/blocks/0/data/actionUrl", blockModel, [block])).toBe(
      "blocks.0.data.actionUrl",
    );
    expect(pointerToFormField("/blocks/0/data/unknown", blockModel, [block])).toBeUndefined();
    expect(
      validateDraftValues(blockModel, {
        blocks: [{ ...block, data: { actionUrl: "/safe" }, key: "invalid" }, { ...block }],
        fields: {},
        title: "Post",
      }),
    ).toMatchObject({ blocks: { 0: { key: {} } } });
  });

  test("suggests a stable collection slug", () => {
    expect(suggestSlug("  Crème brûlée — Launch! ")).toBe("creme-brulee-launch");
  });
});
