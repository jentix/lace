import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { ErrorState } from "./index.js";

test("announces a default-titled alert and keeps request details disclosed on demand", () => {
  render(<ErrorState description="Try again shortly." technicalDetails="req-42" />);
  const alert = screen.getByRole("alert");
  expect(alert).toHaveTextContent("Something went wrong");
  expect(alert).toHaveTextContent("Try again shortly.");
  expect(screen.getByText("Technical details")).toBeInTheDocument();
  expect(screen.getByText("Request ID: req-42")).not.toBeVisible();
});

test("offers the shared Try again action only when a retry is provided", async () => {
  const onRetry = vi.fn();
  const { rerender } = render(<ErrorState description="Failed." />);
  expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  rerender(<ErrorState description="Failed." onRetry={onRetry} />);
  await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
  expect(onRetry).toHaveBeenCalledOnce();
  rerender(<ErrorState description="Failed." onRetry={onRetry} retrying />);
  expect(screen.getByRole("button", { name: "Try again" })).toBeDisabled();
});
