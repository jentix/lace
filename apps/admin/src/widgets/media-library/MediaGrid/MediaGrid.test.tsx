import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { mediaItem } from "../../../app/testing/index.js";
import { MediaGrid } from "./index.js";

test("tiles show lazy thumbnails, filenames, and non-active status, and open details", async () => {
  const user = userEvent.setup();
  const onOpen = vi.fn();
  render(
    <MediaGrid
      items={[mediaItem, { ...mediaItem, filename: "old.png", id: "media-2", status: "deleting" }]}
      label="Media library"
      onOpen={onOpen}
    />,
  );
  const grid = screen.getByRole("list", { name: "Media library" });
  const tiles = within(grid).getAllByRole("button");
  expect(tiles.map((tile) => tile.textContent)).toEqual(["cover.png", "Deletion pendingold.png"]);
  expect(tiles[0]?.querySelector("img")).toHaveAttribute("loading", "lazy");
  expect(tiles[0]).toHaveAttribute("aria-haspopup", "dialog");
  await user.click(screen.getByRole("button", { name: "cover.png" }));
  expect(onOpen).toHaveBeenCalledWith(mediaItem, tiles[0]);
});
