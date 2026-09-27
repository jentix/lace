import type { ContentEntryDto, ContentModelDto } from "@lacecms/contracts";
import { expect, test } from "vitest";
import {
  draftValues,
  entryStatus,
  fieldLabel,
  localDraftJson,
  resolvedPublicPath,
} from "./draft.js";

const model: ContentModelDto = {
  blockDefinitions: [
    {
      fields: { heading: { defaultValue: "Hello", required: false, type: "text" } },
      type: "hero",
      version: 1,
    },
  ],
  blocks: ["hero"],
  fields: {},
  key: "posts",
  kind: "collection",
  route: "/posts/:slug",
  version: 1,
} as unknown as ContentModelDto;

const entry = {
  draft: {
    blocks: [{ data: {}, key: "01J", position: 1024, schemaVersion: 1, type: "hero" }],
    fields: {},
    revision: 3,
    slug: "draft-slug",
    title: "Draft",
  },
  published: { slug: "live-slug" },
} as unknown as ContentEntryDto;

test("fills block defaults and resolves the published public path first", () => {
  const values = draftValues(model, entry);
  expect(values.blocks[0]?.data).toEqual({ heading: "Hello" });
  expect(values).toMatchObject({ slug: "draft-slug", title: "Draft" });
  expect(resolvedPublicPath(model, entry)).toBe("/posts/live-slug");
});

test("labels keys and serializes local drafts canonically", () => {
  expect(fieldLabel("heroImage", undefined)).toBe("Hero Image");
  expect(fieldLabel("heroImage", "Cover")).toBe("Cover");
  expect(localDraftJson({ blocks: [], fields: { b: 1, a: 2 }, title: "T" })).toBe(
    '{"blocks":[],"fields":{"a":2,"b":1},"title":"T"}',
  );
});

test("derives draft, published, and changed status from the revisions", () => {
  const draft = { draft: { revision: 3 } } as unknown as ContentEntryDto;
  const published = {
    draft: { revision: 3 },
    published: { revision: 3 },
  } as unknown as ContentEntryDto;
  const changed = {
    draft: { revision: 4 },
    published: { revision: 3 },
  } as unknown as ContentEntryDto;
  expect(entryStatus(draft)).toBe("draft");
  expect(entryStatus(published)).toBe("published");
  expect(entryStatus(changed)).toBe("changed");
});
