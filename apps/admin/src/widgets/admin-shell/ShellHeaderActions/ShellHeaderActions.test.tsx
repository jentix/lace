import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useState } from "react";
import { expect, test } from "vitest";
import { renderInRouter } from "../../../app/testing/index.js";
import { AdminShell } from "../AdminShell/index.js";
import { ShellHeaderActions } from "./index.js";

function Screen() {
  const [withActions, setWithActions] = useState(true);
  return (
    <>
      <h1>Screen</h1>
      {withActions ? (
        <ShellHeaderActions>
          <button type="button">Screen action</button>
        </ShellHeaderActions>
      ) : undefined}
      <button onClick={() => setWithActions(false)} type="button">
        Leave screen
      </button>
    </>
  );
}

test("screen actions render in the sticky shell header and leave with the screen", async () => {
  const user = userEvent.setup();
  renderInRouter(
    <AdminShell>
      <Screen />
    </AdminShell>,
  );
  const header = (await screen.findByRole("heading", { name: "Screen" }))
    .closest("div.flex-col")
    ?.querySelector("header");
  expect(header).toHaveClass("sticky", "top-0");
  expect(
    await within(header as HTMLElement).findByRole("button", { name: "Screen action" }),
  ).toBeInTheDocument();
  expect(within(screen.getByRole("main")).queryByRole("button", { name: "Screen action" })).toBe(
    null,
  );
  await user.click(screen.getByRole("button", { name: "Leave screen" }));
  expect(screen.queryByRole("button", { name: "Screen action" })).not.toBeInTheDocument();
});

test("outside a shell the actions render inline", () => {
  render(
    <ShellHeaderActions>
      <button type="button">Inline action</button>
    </ShellHeaderActions>,
  );
  expect(screen.getByRole("button", { name: "Inline action" })).toBeInTheDocument();
});
