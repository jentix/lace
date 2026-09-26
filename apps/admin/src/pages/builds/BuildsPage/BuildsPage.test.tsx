import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { BuildsPage } from "./index.js";

test("states that build history is not connected yet", () => {
  render(<BuildsPage />);
  expect(screen.getByRole("heading", { name: "Builds" })).toBeInTheDocument();
  expect(screen.getByText(/connected to remote state in a later session/u)).toBeInTheDocument();
});
