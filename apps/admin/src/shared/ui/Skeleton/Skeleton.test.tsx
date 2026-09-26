import { render } from "@testing-library/react";
import { expect, test } from "vitest";
import { Skeleton } from "./index.js";

test("renders a decorative pulsing placeholder block", () => {
  const { container } = render(<Skeleton className="h-4" />);
  expect(container.firstElementChild).toHaveAttribute("data-slot", "skeleton");
  expect(container.firstElementChild).toHaveClass("animate-pulse", "bg-accent", "h-4");
});
