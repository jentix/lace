import { screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { renderInRouter, stubClient } from "../../../app/testing/index.js";
import { AdminClientError } from "../../../shared/api/index.js";
import { CreateUserDialog } from "./index.js";

const created = { disabled: false, email: "new@lace.test", id: "new-1", role: "editor" as const };

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Create user" }));
  const dialog = await screen.findByRole("dialog", { name: "Create user" });
  await user.type(within(dialog).getByLabelText("Email"), "new@lace.test");
  await user.type(within(dialog).getByLabelText("Password"), "long-password-123");
  await user.click(within(dialog).getByRole("combobox", { name: "Role" }));
  await user.click(await screen.findByRole("option", { name: "Editor" }));
  return dialog;
}

test("creates a user, closes the dialog, and announces the account", async () => {
  const user = userEvent.setup();
  const createUser = vi.fn(async () => created);
  renderInRouter(<CreateUserDialog />, {
    client: stubClient({ createUser }),
    session: { id: "admin-1", role: "admin" },
  });
  const dialog = await fillForm(user);
  expect(within(dialog).getByLabelText("Password")).toHaveAccessibleDescription(
    "At least 12 characters.",
  );
  await user.click(within(dialog).getByRole("button", { name: "Create user" }));
  await waitFor(() =>
    expect(createUser).toHaveBeenCalledWith({
      email: "new@lace.test",
      password: "long-password-123",
      role: "editor",
    }),
  );
  expect(await screen.findByText("Created new@lace.test.")).toBeInTheDocument();
  expect(screen.queryByRole("dialog", { name: "Create user" })).not.toBeInTheDocument();
});

test("keeps the dialog and input when creation is rejected", async () => {
  const user = userEvent.setup();
  renderInRouter(<CreateUserDialog />, {
    client: stubClient({
      createUser: async () => {
        throw new AdminClientError({ message: "Email is already in use.", status: 409 });
      },
    }),
    session: { id: "admin-1", role: "admin" },
  });
  const dialog = await fillForm(user);
  await user.click(within(dialog).getByRole("button", { name: "Create user" }));
  expect(await within(dialog).findByRole("alert")).toHaveTextContent("Email is already in use.");
  expect(within(dialog).getByLabelText("Email")).toHaveValue("new@lace.test");
  expect(within(dialog).getByRole("combobox", { name: "Role" })).toHaveTextContent("Editor");
});

test("cancelling sends nothing and returns focus to the trigger", async () => {
  const user = userEvent.setup();
  const createUser = vi.fn(async () => created);
  renderInRouter(<CreateUserDialog />, { client: stubClient({ createUser }) });
  await user.click(await screen.findByRole("button", { name: "Create user" }));
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Create user" })).toHaveFocus());
  expect(createUser).not.toHaveBeenCalled();
});
