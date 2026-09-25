import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { MediaPreview } from "./media-preview.js";

test("previews unpublished media through the authenticated admin path", () => {
  render(<MediaPreview filename="Draft image.png" mediaId="private/id" />);
  const preview = screen.getByRole("img", { name: "Preview of Draft image.png" });
  expect(preview).toHaveAttribute("src", "/api/v1/admin/media/private%2Fid/preview");
  expect(screen.getByRole("status")).toHaveTextContent("Loading preview");
  fireEvent.load(preview);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test("retains a fallback and offers preview retry after a failure", () => {
  render(<MediaPreview filename="Missing.png" mediaId="missing" />);
  fireEvent.error(screen.getByRole("img", { name: "Preview of Missing.png" }));
  expect(screen.getByRole("status")).toHaveTextContent("Preview unavailable for Missing.png");
  fireEvent.click(screen.getByRole("button", { name: "Retry preview" }));
  expect(screen.getByRole("img", { name: "Preview of Missing.png" })).toHaveAttribute(
    "src",
    "/api/v1/admin/media/missing/preview?attempt=1",
  );
});
