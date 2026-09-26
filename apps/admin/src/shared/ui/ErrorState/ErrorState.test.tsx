import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { ErrorState } from "./index.js";

test("announces a default-titled alert and keeps request details disclosed on demand", () => {
  render(<ErrorState description="Try again shortly." technicalDetails="req-42" />);
  const alert = screen.getByRole("alert");
  expect(alert).toHaveTextContent("Something went wrong");
  expect(alert).toHaveTextContent("Try again shortly.");
  expect(screen.getByText("Technical details")).toBeInTheDocument();
  expect(screen.getByText("Request ID: req-42")).not.toBeVisible();
});
