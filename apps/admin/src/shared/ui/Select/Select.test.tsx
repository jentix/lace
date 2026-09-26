import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./index.js";

test("chooses an option from the keyboard", async () => {
  const user = userEvent.setup();
  const change = vi.fn();
  render(
    <Select onValueChange={change}>
      <SelectTrigger aria-label="Status">
        <SelectValue placeholder="Select an option" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="draft">Draft</SelectItem>
        <SelectItem value="published">Published</SelectItem>
      </SelectContent>
    </Select>,
  );

  const trigger = screen.getByRole("combobox", { name: "Status" });
  expect(trigger).toHaveTextContent("Select an option");
  trigger.focus();
  await user.keyboard("{Enter}");
  await user.click(await screen.findByRole("option", { name: "Published" }));
  expect(change).toHaveBeenCalledWith("published");
  expect(trigger).toHaveTextContent("Published");
});
