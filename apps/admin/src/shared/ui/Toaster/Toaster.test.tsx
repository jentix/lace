import { act, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { Toaster, toast } from "./index.js";

test("announces notifications in a polite region with a named dismiss control", async () => {
  render(<Toaster />);
  act(() => {
    toast.success("Draft saved");
  });

  expect(await screen.findByText("Draft saved")).toBeInTheDocument();
  expect(screen.getByRole("region", { name: /Notifications/u })).toHaveAttribute(
    "aria-live",
    "polite",
  );
  expect(screen.getByRole("button", { name: "Close toast" })).toBeInTheDocument();
});
