import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { mediaItem, renderRoute, stubClient as client } from "../../../app/testing/index.js";
import { createStaticSessionSource } from "../../../entities/session/index.js";
import { AdminClientError } from "../../../shared/api/index.js";

afterEach(() => {
  vi.restoreAllMocks();
});

test("media route distinguishes empty, failure, and paged results for a viewer", async () => {
  const user = userEvent.setup();
  const listMedia = vi.fn(async (cursor?: string) =>
    cursor === undefined
      ? { items: [mediaItem], nextCursor: "opaque+/=" }
      : {
          items: [
            {
              ...mediaItem,
              filename: "later.png",
              id: "media-2",
              status: "delete_failed" as const,
            },
          ],
        },
  );
  renderRoute(
    "/media",
    createStaticSessionSource({ id: "viewer-1", role: "viewer" }),
    client({ listMedia }),
  );
  await screen.findByRole("heading", { name: "Media" });
  expect(await screen.findByText("cover.png")).toBeInTheDocument();
  expect(screen.queryByLabelText("Upload image")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Delete cover/ })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Load more media" }));
  expect(await screen.findByText("later.png")).toBeInTheDocument();
  expect(screen.getByText("Deletion failed")).toBeInTheDocument();
  expect(listMedia).toHaveBeenCalledWith("opaque+/=");
  await user.click(screen.getByRole("button", { name: "Preview cover.png" }));
  expect(screen.getByRole("img", { name: "Preview of cover.png" })).toHaveAttribute(
    "src",
    "/api/v1/admin/media/media-1/preview",
  );

  document.body.replaceChildren();
  renderRoute("/media", createStaticSessionSource({ id: "viewer-1", role: "viewer" }), client());
  expect(await screen.findByRole("heading", { name: "No media yet" })).toBeInTheDocument();

  document.body.replaceChildren();
  renderRoute(
    "/media",
    createStaticSessionSource({ id: "viewer-1", role: "viewer" }),
    client({
      listMedia: async () => {
        throw new AdminClientError({ message: "Media unavailable" });
      },
    }),
  );
  expect(await screen.findByText("Media unavailable")).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "No media yet" })).not.toBeInTheDocument();
});
