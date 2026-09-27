import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import { PasswordField } from "./index.js";

test("toggles password visibility with a pressed, renamed control", async () => {
  const user = userEvent.setup();
  render(<PasswordField defaultValue="secret-value" label="Password" />);
  const input = screen.getByLabelText("Password");
  expect(input).toHaveAttribute("type", "password");
  const toggle = screen.getByRole("button", { name: "Show password" });
  expect(toggle).toHaveAttribute("aria-pressed", "false");
  await user.click(toggle);
  expect(input).toHaveAttribute("type", "text");
  expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("describes the input with its password rule", () => {
  render(<PasswordField description="At least 12 characters." label="Password" />);
  expect(screen.getByLabelText("Password")).toHaveAccessibleDescription("At least 12 characters.");
});
