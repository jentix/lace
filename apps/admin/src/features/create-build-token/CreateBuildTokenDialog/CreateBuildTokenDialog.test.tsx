import { screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { renderInRouter, stubClient } from "../../../app/testing/index.js";
import { AdminClientError, adminQueryKeys } from "../../../shared/api/index.js";
import { CreateBuildTokenDialog } from "./index.js";

const issued = {
  capabilities: ["content:build:read"] as ["content:build:read"],
  createdAt: "2026-09-27T10:00:00.000Z",
  id: "token-1",
  name: "production site",
  token: "lace_bt_plaintext-secret-value",
  tokenPrefix: "lace_bt_plai",
};

test("shows the plaintext once, copies it, and clears it on Done", async () => {
  const user = userEvent.setup();
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  const createToken = vi.fn(async () => issued);
  const { queryClient } = renderInRouter(<CreateBuildTokenDialog />, {
    client: stubClient({ createToken }),
    session: { id: "admin-1", role: "admin" },
  });
  await user.click(await screen.findByRole("button", { name: "Create build token" }));
  const dialog = await screen.findByRole("dialog", { name: "Create build token" });
  await user.type(within(dialog).getByLabelText("Token name"), "production site");
  await user.click(within(dialog).getByRole("button", { name: "Create build token" }));
  const shown = await screen.findByRole("dialog", { name: "Copy your build token" });
  expect(createToken).toHaveBeenCalledWith("production site");
  expect(within(shown).getByTestId("issued-token-value")).toHaveTextContent(issued.token);
  expect(shown).toHaveTextContent("This is the only time");
  await user.click(within(shown).getByRole("button", { name: "Copy token" }));
  expect(writeText).toHaveBeenCalledWith(issued.token);
  expect(await within(shown).findByText("Copied to the clipboard.")).toHaveAttribute(
    "role",
    "status",
  );
  const cached = JSON.stringify(
    queryClient
      .getMutationCache()
      .getAll()
      .map((mutation) => mutation.state.data),
  );
  expect(cached).not.toContain(issued.token);
  expect(JSON.stringify(queryClient.getQueryData(adminQueryKeys.tokens) ?? null)).not.toContain(
    issued.token,
  );

  await user.click(within(shown).getByRole("button", { name: "Done" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(document.body).not.toHaveTextContent(issued.token);
  await user.click(screen.getByRole("button", { name: "Create build token" }));
  const reopened = await screen.findByRole("dialog", { name: "Create build token" });
  expect(within(reopened).getByLabelText("Token name")).toHaveValue("");
  expect(document.body).not.toHaveTextContent(issued.token);
});

test("Escape dismisses the shown token and clears it", async () => {
  const user = userEvent.setup();
  renderInRouter(<CreateBuildTokenDialog />, {
    client: stubClient({ createToken: async () => issued }),
  });
  await user.click(await screen.findByRole("button", { name: "Create build token" }));
  await user.type(screen.getByLabelText("Token name"), "production site");
  await user.keyboard("{Enter}");
  await screen.findByRole("dialog", { name: "Copy your build token" });
  await user.keyboard("{Escape}");
  await waitFor(() => expect(document.body).not.toHaveTextContent(issued.token));
});

test("a failed creation stays on the name step without plaintext", async () => {
  const user = userEvent.setup();
  renderInRouter(<CreateBuildTokenDialog />, {
    client: stubClient({
      createToken: async () => {
        throw new AdminClientError({ message: "Token limit reached.", status: 409 });
      },
    }),
  });
  await user.click(await screen.findByRole("button", { name: "Create build token" }));
  const dialog = await screen.findByRole("dialog", { name: "Create build token" });
  await user.type(within(dialog).getByLabelText("Token name"), "production site");
  await user.click(within(dialog).getByRole("button", { name: "Create build token" }));
  expect(await within(dialog).findByRole("alert")).toHaveTextContent("Token limit reached.");
  expect(within(dialog).getByLabelText("Token name")).toHaveValue("production site");
  expect(screen.queryByTestId("issued-token-value")).not.toBeInTheDocument();
});
