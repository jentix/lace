import { screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { renderRoute, stubClient as client } from "../../../app/testing/index.js";
import {
  createStaticSessionSource,
  type AdminSessionSource,
} from "../../../entities/session/index.js";
import { AdminClientError } from "../../../shared/api/index.js";

afterEach(() => {
  vi.restoreAllMocks();
});

test("admin user screen creates accounts and keeps confirmed state on last-admin rejection", async () => {
  const user = userEvent.setup();
  const soleAdmin = {
    disabled: false,
    email: "admin@lace.test",
    id: "admin-1",
    role: "admin" as const,
  };
  const listUsers = vi.fn(async () => ({ items: [soleAdmin] }));
  const createUser = vi.fn(async () => ({
    disabled: false,
    email: "new@lace.test",
    id: "new-1",
    role: "viewer" as const,
  }));
  const updateUser = vi.fn(async () => {
    throw new AdminClientError({
      code: "LAST_ADMIN_PROTECTED",
      message: "The final active administrator cannot be disabled or demoted.",
      status: 409,
    });
  });
  renderRoute(
    "/users",
    createStaticSessionSource({ id: "admin-1", role: "admin" }),
    client({ createUser, listUsers, updateUser }),
  );
  await screen.findByText("admin@lace.test");
  await user.type(screen.getByLabelText("Email"), "new@lace.test");
  await user.type(screen.getByLabelText("Password"), "long-password-123");
  await user.click(screen.getByRole("button", { name: "Create user" }));
  await waitFor(() =>
    expect(createUser).toHaveBeenCalledWith({
      email: "new@lace.test",
      password: "long-password-123",
      role: "viewer",
    }),
  );
  expect(await screen.findByText("Created new@lace.test.")).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText("Role for admin@lace.test"), "editor");
  await user.click(screen.getByRole("button", { name: "Save role" }));
  expect(
    await screen.findByText("The final active administrator cannot be disabled or demoted."),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Role for admin@lace.test")).toHaveValue("admin");
  expect(screen.getByText("Active")).toBeInTheDocument();
  expect(listUsers).toHaveBeenCalled();
});

test("expired user request returns to login without stale management content", async () => {
  let current: { id: string; role: "admin" } | null = { id: "admin-1", role: "admin" };
  const source: AdminSessionSource = { get: async () => current, invalidate: () => undefined };
  renderRoute(
    "/users",
    source,
    client({
      listUsers: async () => {
        current = null;
        throw new AdminClientError({ message: "Session expired", status: 401 });
      },
    }),
  );
  expect(
    await screen.findByRole("heading", { name: "Sign in" }, { timeout: 5000 }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Users" })).not.toBeInTheDocument();
});

test("non-admin management routes issue no protected requests", async () => {
  const listUsers = vi.fn(async () => ({ items: [] }));
  const listTokens = vi.fn(async () => ({ items: [] }));
  renderRoute(
    "/users",
    createStaticSessionSource({ id: "editor-1", role: "editor" }),
    client({ listUsers }),
  );
  await screen.findByRole("heading", { name: "Access denied" });
  expect(listUsers).not.toHaveBeenCalled();
  document.body.replaceChildren();
  renderRoute(
    "/settings",
    createStaticSessionSource({ id: "viewer-1", role: "viewer" }),
    client({ listTokens }),
  );
  await screen.findByRole("heading", { name: "Access denied" });
  expect(listTokens).not.toHaveBeenCalled();
});
