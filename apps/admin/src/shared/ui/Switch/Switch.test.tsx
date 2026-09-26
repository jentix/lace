import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useState } from "react";
import { expect, test } from "vitest";
import { Switch } from "./index.js";

function Harness({ disabled = false }: { readonly disabled?: boolean }) {
  const [checked, setChecked] = useState(false);
  return (
    <>
      <label htmlFor="enabled">Enabled</label>
      <Switch checked={checked} disabled={disabled} id="enabled" onCheckedChange={setChecked} />
    </>
  );
}

test("a switch toggles from the keyboard and reports its state", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  const toggle = screen.getByRole("switch", { name: "Enabled" });
  expect(toggle).toHaveAttribute("aria-checked", "false");
  toggle.focus();
  await user.keyboard(" ");
  expect(toggle).toHaveAttribute("aria-checked", "true");
  await user.keyboard("{Enter}");
  expect(toggle).toHaveAttribute("aria-checked", "false");
  expect(toggle).toHaveAttribute("type", "button");
});

test("a disabled switch ignores activation", async () => {
  const user = userEvent.setup();
  render(<Harness disabled />);
  const toggle = screen.getByRole("switch", { name: "Enabled" });
  await user.click(toggle);
  expect(toggle).toHaveAttribute("aria-checked", "false");
  expect(toggle).toBeDisabled();
});
