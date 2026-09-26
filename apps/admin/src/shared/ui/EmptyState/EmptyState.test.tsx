import { render, screen } from "@testing-library/react";
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
