import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { ScrollArea } from "./index.js";

test("keeps its content in a viewport that does not suppress the focus outline", () => {
  render(
    <ScrollArea className="h-24">
      <p>Long media list</p>
    </ScrollArea>,
  );
  const viewport = screen.getByText("Long media list").closest("[data-slot=scroll-area-viewport]");
  expect(viewport).toBeInTheDocument();
  expect(viewport?.className).not.toMatch(/outline-(?:none|hidden)/u);
});
