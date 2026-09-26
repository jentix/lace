import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { NotFoundPage } from "./index.js";

test("explains an unknown admin route in a main landmark", () => {
  render(<NotFoundPage />);
  expect(screen.getByRole("main")).toContainElement(
    screen.getByRole("heading", { name: "Page not found" }),
  );
  expect(screen.getByRole("alert")).toHaveTextContent("This route does not exist in Lace admin.");
});
