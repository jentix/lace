import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { entry, entryList, renderRoute, stubClient as client } from "../../../app/testing/index.js";
import { createStaticSessionSource } from "../../../entities/session/index.js";

afterEach(() => {
  vi.restoreAllMocks();
});

test("collection lists keep cursors opaque and expose permitted mutations", async () => {
  const user = userEvent.setup();
  const listEntries = vi.fn(async (_modelKey: string, cursor?: string) =>
    cursor === undefined
      ? entryList([entry], "opaque+/=")
      : entryList([{ ...entry, id: "entry-2", title: "Second post" }]),
  );
  renderRoute(
    "/content/posts",
    createStaticSessionSource({ id: "editor-1", role: "editor" }),
    client({ listEntries }),
  );

  expect(await screen.findByRole("table", { name: "posts entries" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Load more entries" }));
  expect(await screen.findByText("Second post")).toBeInTheDocument();
  expect(listEntries).toHaveBeenLastCalledWith("posts", "opaque+/=");
  expect(screen.getByRole("button", { name: "Create entry" })).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Delete" })).toHaveLength(2);
});

test("viewers see content but not collection mutations", async () => {
  renderRoute("/content/posts", createStaticSessionSource({ id: "viewer-1", role: "viewer" }));
  await screen.findByRole("table", { name: "posts entries" });
  expect(screen.queryByRole("button", { name: "Create entry" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
});
