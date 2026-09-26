import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import { TextField } from "./index.js";

test("labels its input and receives keyboard focus", async () => {
  const user = userEvent.setup();
  render(<TextField label="Entry title" required />);

  await user.tab();
  const input = screen.getByLabelText("Entry title");
  expect(input).toHaveFocus();
  expect(input).toBeRequired();
});
