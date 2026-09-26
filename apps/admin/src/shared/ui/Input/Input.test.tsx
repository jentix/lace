import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import { Input } from "./index.js";

test("renders a labelled token-styled text input", async () => {
  const user = userEvent.setup();
  render(
    <label>
      Entry title
      <Input aria-invalid defaultValue="" />
    </label>,
  );
  const input = screen.getByRole("textbox", { name: "Entry title" });
  expect(input).toHaveClass("border-input", "bg-background", "aria-invalid:border-destructive");
  await user.type(input, "Welcome");
  expect(input).toHaveValue("Welcome");
});
