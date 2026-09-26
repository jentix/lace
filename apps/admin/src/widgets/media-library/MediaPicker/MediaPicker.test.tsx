import { fireEvent, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import type { ContentModelDto } from "@lacecms/contracts";
import {
  draftEntry,
  mediaItem,
  renderRoute,
  stubClient as client,
} from "../../../app/testing/index.js";
import { createStaticSessionSource } from "../../../entities/session/index.js";
import { AdminClientError } from "../../../shared/api/index.js";

afterEach(() => {
  vi.restoreAllMocks();
});

test("model media picker reuses a later page and preserves an unresolved selection", async () => {
  const user = userEvent.setup();
  const model: ContentModelDto = {
    blocks: [],
    fields: { hero: { required: false, type: "media" } },
    key: "posts",
    kind: "collection",
    route: "/posts/:slug",
    version: 1,
  };
  const saveDraft = vi.fn(async () => ({}) as never);
  renderRoute(
    "/content/posts/entry-1",
    createStaticSessionSource({ id: "editor-1", role: "editor" }),
    client({
      listMedia: async (cursor) =>
        cursor === undefined
          ? { items: [], nextCursor: "next" }
          : { items: [{ ...mediaItem, id: "media-2", filename: "later.png" }] },
      listModels: async () => ({ items: [model] }),
      loadEntry: async () => ({
        ...draftEntry,
        draft: { ...draftEntry.draft, fields: { hero: "missing-1" } },
      }),
      saveDraft,
    }),
  );
  await screen.findByRole("heading", { name: "Edit posts" });
  await user.click(screen.getByRole("button", { name: "Choose media for Hero" }));
  expect(screen.getByText("Selection not found in loaded pages yet.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Load more media" }));
  expect(
    await screen.findByText("Selected media is unavailable or inaccessible."),
  ).toBeInTheDocument();
  expect(screen.getByText("Selected: missing-1")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "later.png" }));
  expect(screen.getByText("Selected: media-2")).toBeInTheDocument();
  expect(saveDraft).not.toHaveBeenCalled();
});

test("block media picker uploads only into choices and preserves draft on list failure", async () => {
  const user = userEvent.setup();
  const model: ContentModelDto = {
    blockDefinitions: [
      { fields: { image: { required: false, type: "media" } }, type: "hero", version: 1 },
    ],
    blocks: ["hero"],
    fields: {},
    key: "posts",
    kind: "collection",
    route: "/posts/:slug",
    version: 1,
  };
  const uploadMedia = vi.fn(async () => mediaItem);
  renderRoute(
    "/content/posts/entry-1",
    createStaticSessionSource({ id: "editor-1", role: "editor" }),
    client({
      listMedia: async () => {
        throw new AdminClientError({ message: "Media list failed" });
      },
      listModels: async () => ({ items: [model] }),
      uploadMedia,
    }),
  );
  await screen.findByRole("heading", { name: "Edit posts" });
  await user.click(screen.getByRole("button", { name: "Add Hero" }));
  await user.click(screen.getByRole("button", { name: "Choose media for Image" }));
  expect(await screen.findByText("Media list failed")).toBeInTheDocument();
  expect(screen.getByText("No media selected")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Upload image"), {
    target: { files: [new File(["png"], "cover.png", { type: "image/png" })] },
  });
  expect(await screen.findByRole("button", { name: "cover.png" })).toBeInTheDocument();
  expect(screen.getByText("No media selected")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "cover.png" }));
  expect(screen.getByText("Selected: media-1")).toBeInTheDocument();
});
