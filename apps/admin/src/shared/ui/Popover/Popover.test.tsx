import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import { Button } from "../Button/index.js";
import { Popover, PopoverContent, PopoverTrigger } from "./index.js";

test("toggles popover content from its trigger and closes on Escape", async () => {
  const user = userEvent.setup();
  render(
    <Popover>
      <PopoverTrigger asChild>
        <Button>Details</Button>
      </PopoverTrigger>
      <PopoverContent>Media details</PopoverContent>
    </Popover>,
  );

  const trigger = screen.getByRole("button", { name: "Details" });
  await user.click(trigger);
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  expect(await screen.findByText("Media details")).toHaveClass("bg-popover");
  await user.keyboard("{Escape}");
  expect(screen.queryByText("Media details")).not.toBeInTheDocument();
});
