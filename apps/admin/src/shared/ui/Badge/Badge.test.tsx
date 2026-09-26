import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { Badge } from "./index.js";

test("maps status variants to token surface pairs", () => {
  render(
    <>
      <Badge variant="success">Published</Badge>
      <Badge variant="warning">Draft</Badge>
      <Badge variant="secondary">Neutral</Badge>
    </>,
  );
  expect(screen.getByText("Published")).toHaveClass("bg-success", "text-success-foreground");
  expect(screen.getByText("Draft")).toHaveClass("bg-warning", "text-warning-foreground");
  expect(screen.getByText("Neutral")).toHaveClass("bg-secondary", "text-secondary-foreground");
});
