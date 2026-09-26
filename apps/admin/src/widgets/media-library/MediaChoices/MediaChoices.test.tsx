import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { mediaItem, renderInRouter, stubClient } from "../../../app/testing/index.js";
import { MediaChoices } from "./index.js";

test("offers only active media as choices and reports the chosen item", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  renderInRouter(<MediaChoices onSelect={onSelect} selectionLabel="Hero" />, {
    client: stubClient({
      listMedia: async () => ({
        items: [
          mediaItem,
          { ...mediaItem, filename: "gone.png", id: "media-2", status: "deleting" as const },
        ],
      }),
    }),
  });
  const choices = await screen.findByRole("list", { name: "Media choices for Hero" });
  expect(choices).toHaveTextContent("cover.png");
  expect(choices).not.toHaveTextContent("gone.png");
  expect(screen.getByText("No media selected")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "cover.png" }));
  expect(onSelect).toHaveBeenCalledWith("media-1");
});

test("viewers choose without upload controls", async () => {
  renderInRouter(<MediaChoices onSelect={vi.fn()} selectionLabel="Hero" value="media-1" />, {
    client: stubClient({ listMedia: async () => ({ items: [mediaItem] }) }),
    session: { id: "viewer-1", role: "viewer" },
  });
  expect(await screen.findByText("Selected: media-1")).toBeInTheDocument();
  expect(screen.queryByLabelText("Upload image")).not.toBeInTheDocument();
});
