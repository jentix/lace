import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { EntryStatusBadge } from "./index.js";

test("entry status badge names each derived status", () => {
  render(
    <>
      <EntryStatusBadge status="draft" />
      <EntryStatusBadge status="published" />
      <EntryStatusBadge status="changed" />
    </>,
  );
  expect(screen.getByText("Draft")).toHaveAttribute("data-variant", "warning");
  expect(screen.getByText("Published")).toHaveAttribute("data-variant", "success");
  expect(screen.getByText("Changed")).toHaveClass("bg-accent");
});
