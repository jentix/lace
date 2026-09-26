import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { MediaThumbnail } from "./index.js";

test("thumbnails load lazily through the admin preview path", () => {
  const { container } = render(<MediaThumbnail mediaId="private/id" />);
  const image = container.querySelector("img");
  expect(image).toHaveAttribute("loading", "lazy");
  expect(image).toHaveAttribute("src", "/api/v1/admin/media/private%2Fid/preview");
  expect(image).toHaveAttribute("alt", "");
});

test("a failed thumbnail falls back to an icon", () => {
  const { container } = render(<MediaThumbnail mediaId="missing" />);
  fireEvent.error(container.querySelector("img") as HTMLImageElement);
  expect(container.querySelector("img")).toBeNull();
  expect(screen.getByTestId("thumbnail-fallback")).toBeInTheDocument();
});
