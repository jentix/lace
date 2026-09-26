import { screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { mediaItem, renderRoute, stubClient as client } from "../../../app/testing/index.js";
import { createStaticSessionSource } from "../../../entities/session/index.js";
import { AdminClientError } from "../../../shared/api/index.js";

afterEach(() => {
  vi.restoreAllMocks();
});

test("media deletion keeps failed items and labels accepted work as pending", async () => {
  const user = userEvent.setup();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  const deleteMedia = vi.fn(async () => {
    throw new AdminClientError({
      code: "CONTENT_INVALID_STATE",
      message: "The requested content operation is invalid.",
      status: 422,
    });
  });
  const retryMediaDeletion = vi.fn(async () => ({
    ...mediaItem,
    id: "failed-1",
    filename: "failed.png",
    status: "deleting" as const,
  }));
  renderRoute(
    "/media",
    createStaticSessionSource({ id: "editor-1", role: "editor" }),
    client({
      deleteMedia,
      listMedia: async () => ({
        items: [
          mediaItem,
          {
            ...mediaItem,
            id: "failed-1",
            filename: "failed.png",
            status: "delete_failed" as const,
          },
        ],
      }),
      retryMediaDeletion,
    }),
  );
  await screen.findByText("failed.png");
  await user.click(screen.getByRole("button", { name: "Delete cover.png" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("may be referenced by content");
  expect(screen.getByText("cover.png")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Retry deletion of failed.png" }));
  await waitFor(() => expect(retryMediaDeletion).toHaveBeenCalledWith("failed-1"));
  expect(await screen.findByText("Deletion pending")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Retry deletion of failed.png" }),
  ).not.toBeInTheDocument();
});

test("keyboard deletion confirmation shows pending state only after API acceptance", async () => {
  const user = userEvent.setup();
  vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
  const deleteMedia = vi.fn(async () => ({ ...mediaItem, status: "deleting" as const }));
  renderRoute(
    "/media",
    createStaticSessionSource({ id: "admin-1", role: "admin" }),
    client({
      deleteMedia,
      listMedia: async () => ({ items: [mediaItem] }),
    }),
  );
  await screen.findByText("cover.png");
  const button = screen.getByRole("button", { name: "Delete cover.png" });
  button.focus();
  await user.keyboard("{Enter}");
  expect(deleteMedia).not.toHaveBeenCalled();
  await user.keyboard("{Enter}");
  await waitFor(() => expect(deleteMedia).toHaveBeenCalledWith("media-1"));
  expect(await screen.findByText("Deletion pending")).toBeInTheDocument();
});
