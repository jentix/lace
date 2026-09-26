import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { LoadingState } from "./index.js";

test("exposes a named busy status with the requested placeholder lines", () => {
  render(<LoadingState label="Loading entries" lines={3} />);
  const status = screen.getByRole("status", { name: "Loading entries" });
  expect(status).toHaveAttribute("aria-busy", "true");
  expect(status.children).toHaveLength(3);
});
