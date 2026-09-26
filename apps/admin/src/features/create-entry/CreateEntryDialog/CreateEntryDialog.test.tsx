import { screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { entry, entryList, renderRoute, stubClient as client } from "../../../app/testing/index.js";
import { createStaticSessionSource } from "../../../entities/session/index.js";
import type { EntryListQuery } from "../../../shared/api/index.js";

afterEach(() => {
  vi.restoreAllMocks();
});

test("entry creation and confirmed deletion refresh the active collection list", async () => {
  const user = userEvent.setup();
  const createEntry = vi.fn(async () => ({}) as never);
  const deleteEntry = vi.fn(async () => undefined);
  const listEntries = vi.fn(async (_modelKey: string, _cursor?: string, _query?: EntryListQuery) =>
    entryList([entry]),
  );
  // The collection list pages without a limit; the shell overview asks for one entry.
  const listCalls = () =>
    listEntries.mock.calls.filter(
      ([key, , query]) => key === "posts" && query?.limit === undefined,
    );
  const overviewCalls = () =>
    listEntries.mock.calls.filter(([key, , query]) => key === "posts" && query?.limit === 1);
  renderRoute(
    "/content/posts",
    createStaticSessionSource({ id: "editor-1", role: "editor" }),
    client({ createEntry, deleteEntry, listEntries }),
  );
  await screen.findByRole("table", { name: "posts entries" });
  await waitFor(() => expect(overviewCalls()).toHaveLength(1));

  await user.click(screen.getByRole("button", { name: "Create entry" }));
  const createDialog = screen.getByRole("dialog", { name: "Create entry" });
  await user.type(within(createDialog).getByLabelText("Title"), "New post");
  await user.click(within(createDialog).getByRole("button", { name: "Create entry" }));
  await waitFor(() => expect(createEntry).toHaveBeenCalledWith("posts", "New post"));
  await waitFor(() => expect(listCalls()).toHaveLength(2));
  await waitFor(() => expect(overviewCalls()).toHaveLength(2));

  await user.click(screen.getByRole("button", { name: "Delete" }));
  const deleteDialog = screen.getByRole("dialog", { name: "Delete entry" });
  await user.click(within(deleteDialog).getByRole("button", { name: "Confirm deletion" }));
  await waitFor(() => expect(deleteEntry).toHaveBeenCalledWith("entry-1", 2));
});
