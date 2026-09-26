import { screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { renderRoute } from "../../../app/testing/index.js";
import { createStaticSessionSource } from "../../../entities/session/index.js";

afterEach(() => {
  vi.restoreAllMocks();
});

test("role-aware navigation and direct admin-only route behavior follow the role matrix", async () => {
  renderRoute("/users", createStaticSessionSource({ id: "viewer-1", role: "viewer" }));
  expect(await screen.findByRole("heading", { name: "Access denied" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Users" })).not.toBeInTheDocument();

  document.body.replaceChildren();
  renderRoute("/content", createStaticSessionSource({ id: "editor-1", role: "editor" }));
  await screen.findByRole("heading", { name: "Content" });
  expect(screen.queryByRole("link", { name: "Users" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Media" })).toBeInTheDocument();
});
