import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { UserMenu } from "./index.js";

test("user menu names the user and role and runs log out from the keyboard", async () => {
  const user = userEvent.setup();
  const onSignOut = vi.fn();
  render(
    <UserMenu displayName="Ada Editor" onSignOut={onSignOut} role="editor" signingOut={false} />,
  );

  const trigger = screen.getByRole("button", { name: /Ada Editor, Editor/ });
  expect(trigger).toHaveTextContent("AE");
  trigger.focus();
  await user.keyboard("{Enter}");
  const menu = await screen.findByRole("menu");
  expect(menu).toHaveTextContent("Ada Editor");
  await user.keyboard("{ArrowDown}");
  await user.click(screen.getByRole("menuitem", { name: "Log out" }));
  expect(onSignOut).toHaveBeenCalledOnce();
});

test("user menu falls back to a neutral label and never shows an identifier", async () => {
  const user = userEvent.setup();
  render(<UserMenu onSignOut={() => undefined} role="viewer" signingOut />);
  const trigger = screen.getByRole("button", { name: /Signed-in user, Viewer/ });
  trigger.focus();
  await user.keyboard("{Enter}");
  expect(await screen.findByRole("menuitem", { name: "Signing out…" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  expect(document.body).not.toHaveTextContent(/viewer-1/);
});
