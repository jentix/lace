import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { Button } from "../Button/index.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./index.js";

test("opens a keyboard-navigable menu and runs the chosen item", async () => {
  const user = userEvent.setup();
  const select = vi.fn();
  render(
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>Account</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Signed in</DropdownMenuLabel>
        <DropdownMenuItem onSelect={select}>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>,
  );

  screen.getByRole("button", { name: "Account" }).focus();
  await user.keyboard("{Enter}");
  expect(await screen.findByRole("menu")).toBeInTheDocument();
  await user.keyboard("{ArrowDown}{Enter}");
  expect(select).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});
