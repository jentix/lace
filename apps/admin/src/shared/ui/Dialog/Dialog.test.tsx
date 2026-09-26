import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import { Button } from "../Button/index.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./index.js";

test("opens from the keyboard, is named by its title, and returns focus on Escape", async () => {
  const user = userEvent.setup();
  render(
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm action</DialogTitle>
          <DialogDescription>Review the change before continuing.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>,
  );

  const trigger = screen.getByRole("button", { name: "Open dialog" });
  await user.tab();
  await user.keyboard("{Enter}");
  const dialog = screen.getByRole("dialog", { name: "Confirm action" });
  expect(dialog).toHaveAccessibleDescription("Review the change before continuing.");
  expect(screen.getByRole("button", { name: "Close dialog" })).toBeInTheDocument();
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});
