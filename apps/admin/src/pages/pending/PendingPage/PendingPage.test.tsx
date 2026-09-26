import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { PendingPage } from "./index.js";

test("shows only a neutral access check while a route guard resolves", () => {
  render(<PendingPage />);
  expect(screen.getByRole("main", { name: "Checking access" })).toBeInTheDocument();
  expect(screen.getByRole("status", { name: "Checking access" })).toBeInTheDocument();
  expect(screen.queryByRole("heading")).not.toBeInTheDocument();
});
