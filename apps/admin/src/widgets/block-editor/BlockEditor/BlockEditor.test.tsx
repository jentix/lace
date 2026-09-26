import { screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import type { ContentModelDto } from "@lacecms/contracts";
import {
  draftEntry,
  models,
  renderRoute,
  stubClient as client,
} from "../../../app/testing/index.js";
import { createStaticSessionSource } from "../../../entities/session/index.js";
import { AdminClientError, type AdminClient } from "../../../shared/api/index.js";

afterEach(() => {
  vi.restoreAllMocks();
});

test("entry editor authors ordered blocks, selects media, and adopts server positions", async () => {
  const user = userEvent.setup();
  const model: ContentModelDto = {
    blockDefinitions: [
      {
        defaultValue: { heading: "New hero" },
        fields: {
          heading: { required: true, type: "text" },
          image: { required: false, type: "media" },
        },
        label: "Hero",
        type: "hero",
        version: 1,
      },
      {
        fields: { quote: { required: true, type: "text" } },
        label: "Quote",
        type: "quote",
        version: 1,
      },
    ],
    blocks: ["hero", "quote"],
    fields: { richBody: { required: false, type: "richText" } },
    key: "posts",
    kind: "collection",
    route: "/posts/:slug",
    version: 1,
  };
  const saveDraftMock = vi.fn(
    async (_entryId: string, input: Parameters<AdminClient["saveDraft"]>[1]) => ({
      ...draftEntry,
      draft: {
        ...draftEntry.draft,
        ...input,
        blocks: input.blocks.map((block, index) => ({ ...block, position: (index + 1) * 100 })),
        revision: 3,
      },
    }),
  );
  const saveDraft = saveDraftMock as unknown as AdminClient["saveDraft"];
  renderRoute(
    "/content/posts/entry-1",
    createStaticSessionSource({ id: "editor-1", role: "editor" }),
    client({
      listMedia: async () => ({
        items: [
          {
            createdAt: "2026-09-20T00:00:00.000Z",
            createdBy: { displayName: "editor@lace.test", id: "editor-1" },
            filename: "cover.png",
            id: "media-1",
            mimeType: "image/png",
            size: 12,
            status: "active",
            updatedAt: "2026-09-20T00:00:00.000Z",
            url: "https://lace.test/api/v1/public/media/media-1",
            usageCount: 0,
          },
        ],
      }),
      listModels: async () => ({ items: [models.items[0]!, model] }) as never,
      saveDraft,
    }),
  );

  await screen.findByRole("heading", { name: "Edit posts" });
  expect(screen.getByRole("textbox", { name: "Rich Body" })).toBeInTheDocument();
  expect(screen.queryByRole("textbox", { name: /json/i })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Add Hero" }));
  await user.click(screen.getByRole("button", { name: "Choose media for Image" }));
  await user.click(await screen.findByRole("button", { name: "cover.png" }));
  expect(screen.getByText("Selected: media-1")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Duplicate" }));
  expect(screen.getAllByRole("heading", { name: "Hero" })).toHaveLength(2);
  await user.click(screen.getByRole("button", { name: "Add Quote" }));
  await user.click(screen.getAllByRole("button", { name: "Move up" })[2]!);
  await user.click(screen.getAllByRole("button", { name: "Collapse" })[0]!);
  expect(screen.getByRole("button", { name: "Expand" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() => expect(saveDraftMock).toHaveBeenCalledTimes(1));
  const saved = saveDraftMock.mock.calls[0]![1];
  expect(saved.blocks).toHaveLength(3);
  expect(saved.blocks.map((block) => block.type)).toEqual(["hero", "quote", "hero"]);
  expect(saved.blocks.every((block) => /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/u.test(block.key))).toBe(
    true,
  );
  expect(saved.blocks.some((block) => block.data.image === "media-1")).toBe(true);
  expect(await screen.findByText("Saved revision 3")).toBeInTheDocument();
});

test("server block validation stays on the nested editable block field", async () => {
  const user = userEvent.setup();
  const model: ContentModelDto = {
    blockDefinitions: [
      { fields: { heading: { required: true, type: "text" } }, type: "hero", version: 1 },
    ],
    blocks: ["hero"],
    fields: {},
    key: "posts",
    kind: "collection",
    route: "/posts/:slug",
    version: 1,
  };
  const existingBlock = {
    data: { heading: "Original" },
    key: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
    position: 100,
    schemaVersion: 1,
    type: "hero",
  };
  renderRoute(
    "/content/posts/entry-1",
    createStaticSessionSource({ id: "editor-1", role: "editor" }),
    client({
      listModels: async () => ({ items: [models.items[0]!, model] }) as never,
      loadEntry: async () => ({
        ...draftEntry,
        draft: { ...draftEntry.draft, blocks: [existingBlock] },
      }),
      saveDraft: async () => {
        throw new AdminClientError({
          issues: [
            {
              code: "invalid_value",
              message: "Heading is unavailable.",
              path: "/blocks/0/data/heading",
            },
          ],
          message: "The draft was rejected.",
          status: 422,
        });
      },
    }),
  );
  await screen.findByRole("heading", { name: "Edit posts" });
  await user.clear(screen.getByLabelText("Heading"));
  await user.type(screen.getByLabelText("Heading"), "Retain me");
  await user.click(screen.getByRole("button", { name: "Save draft" }));
  expect(await screen.findByText("Heading is unavailable.")).toHaveAttribute("role", "alert");
  expect(screen.getByLabelText("Heading")).toHaveValue("OriginalRetain me");
});
