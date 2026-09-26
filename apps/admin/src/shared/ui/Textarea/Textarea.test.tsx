import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import { Textarea } from "./index.js";

test("renders a labelled multi-line text control", async () => {
  const user = userEvent.setup();
  render(
    <label>
      Summary
      <Textarea rows={5} />
    </label>,
  );
  const textarea = screen.getByRole("textbox", { name: "Summary" });
  expect(textarea).toHaveAttribute("rows", "5");
  await user.type(textarea, "First line{Enter}Second line");
  expect(textarea).toHaveValue("First line\nSecond line");
});
