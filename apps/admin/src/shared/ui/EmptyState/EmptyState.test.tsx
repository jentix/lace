import { render, screen } from "@testing-library/react";
import { Inbox } from "lucide-react";
import { expect, test } from "vitest";
import { EmptyState } from "./index.js";

test("renders a titled region with guidance and an optional action", () => {
  render(
    <EmptyState
      action={<button type="button">Create entry</button>}
      description="Create your first entry."
      title="No entries yet"
    />,
  );
  const region = screen.getByRole("region", { name: "No entries yet" });
  expect(region).toHaveTextContent("Create your first entry.");
  expect(screen.getByRole("button", { name: "Create entry" })).toBeInTheDocument();
});

test("renders an optional icon hidden from assistive technology", () => {
  const { container } = render(
    <EmptyState description="Nothing here." icon={Inbox} title="Empty" />,
  );
  const icon = container.querySelector("svg");
  expect(icon).toHaveAttribute("aria-hidden", "true");
  expect(screen.getByRole("region", { name: "Empty" })).toHaveTextContent("Nothing here.");
});
