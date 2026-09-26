import { screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { renderRoute, stubClient as client } from "../../../app/testing/index.js";
import { createStaticSessionSource } from "../../../entities/session/index.js";
import { AdminClientError } from "../../../shared/api/index.js";

afterEach(() => {
  vi.restoreAllMocks();
});

test("role-aware navigation and direct admin-only route behavior follow the role matrix", async () => {
  renderRoute("/users", createStaticSessionSource({ id: "viewer-1", role: "viewer" }));
  expect(await screen.findByRole("heading", { name: "Access denied" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Users" })).not.toBeInTheDocument();

  document.body.replaceChildren();
  renderRoute("/content", createStaticSessionSource({ id: "editor-1", role: "editor" }));
  await screen.findByRole("heading", { name: "Content", level: 1 });
  const aside = screen.getByRole("complementary", { name: "Admin navigation" });
  expect(within(aside).queryByRole("link", { name: "Users" })).not.toBeInTheDocument();
  expect(within(aside).getByRole("link", { name: "Media" })).toBeInTheDocument();

  document.body.replaceChildren();
  renderRoute("/settings", createStaticSessionSource({ id: "admin-1", role: "admin" }));
  const adminAside = await screen.findByRole("complementary", { name: "Admin navigation" });
  expect(within(adminAside).getByRole("link", { name: "Settings" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("the skip link comes first and moves focus to the main content", async () => {
  const user = userEvent.setup();
  renderRoute("/content", createStaticSessionSource({ id: "editor-1", role: "editor" }));
  await screen.findByRole("heading", { name: "Content", level: 1 });
  await user.tab();
  const skip = screen.getByRole("link", { name: "Skip to content" });
  expect(skip).toHaveFocus();
  expect(skip).toHaveAttribute("href", "#main-content");
  expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
});

test("a failed logout reports the error and keeps the route rendered", async () => {
  const user = userEvent.setup();
  renderRoute(
    "/content",
    createStaticSessionSource({ displayName: "Ada Editor", id: "editor-1", role: "editor" }),
    client({ signOut: async () => Promise.reject(new AdminClientError({ message: "Auth down" })) }),
  );
  await screen.findByRole("heading", { name: "Content", level: 1 });
  const account = screen.getAllByRole("button", { name: /Ada Editor, Editor/ })[0];
  account?.focus();
  await user.keyboard("{Enter}");
  await user.click(await screen.findByRole("menuitem", { name: "Log out" }));
  expect(await screen.findByText(/Auth down/)).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Content", level: 1 })).toBeInTheDocument();
});
