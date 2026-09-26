import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import { Button } from "../Button/index.js";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "./index.js";

test("opens a named side panel that closes through its close button", async () => {
  const user = userEvent.setup();
  render(
    <Sheet>
      <SheetTrigger asChild>
        <Button>Menu</Button>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetTitle>Navigation</SheetTitle>
        <SheetDescription>Admin sections</SheetDescription>
      </SheetContent>
    </Sheet>,
  );

  await user.click(screen.getByRole("button", { name: "Menu" }));
  expect(screen.getByRole("dialog", { name: "Navigation" })).toHaveClass("left-0");
  await user.click(screen.getByRole("button", { name: "Close dialog" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Menu" })).toHaveFocus();
});
