import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { renderRoute, stubClient as client } from "../../../app/testing/index.js";
import { createStaticSessionSource } from "../../../entities/session/index.js";
import { AdminClientError } from "../../../shared/api/index.js";

afterEach(() => {
  vi.restoreAllMocks();
});

test("settings shows status, dismisses a once-shown token, and preserves metadata on revoke failure", async () => {
  const user = userEvent.setup();
  const token = {
    capabilities: ["content:build:read"] as ["content:build:read"],
    createdAt: "2026-09-20T00:00:00.000Z",
    id: "token-1",
    name: "Local",
    tokenPrefix: "lace_123",
  };
  const createToken = vi.fn(async () => ({ ...token, token: "only-once-secret" }));
  const revokeToken = vi.fn(async () => {
    throw new AdminClientError({ message: "Revocation failed", status: 500 });
  });
  vi.spyOn(window, "confirm").mockReturnValue(true);
  renderRoute(
    "/settings",
    createStaticSessionSource({ id: "admin-1", role: "admin" }),
    client({
      createToken,
      listTokens: async () => ({ items: [token] }),
      loadSettingsStatus: async () => ({ configuredModels: 2, ready: true }),
      revokeToken,
    }),
  );
  expect(await screen.findByText(/Configured models: 2/)).toBeInTheDocument();
  await user.type(screen.getByLabelText("Token name"), "Local");
  await user.click(screen.getByRole("button", { name: "Create build token" }));
  expect(await screen.findByText("only-once-secret")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Dismiss token" }));
  expect(screen.queryByText("only-once-secret")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Revoke Local" }));
  expect(await screen.findByText("Revocation failed")).toBeInTheDocument();
  expect(screen.getByText("Active")).toBeInTheDocument();
  await user.type(screen.getByLabelText("Token name"), "Another");
  await user.click(screen.getByRole("button", { name: "Create build token" }));
  expect(await screen.findByText("only-once-secret")).toBeInTheDocument();
  await user.click(screen.getByRole("link", { name: "Content" }));
  await screen.findByRole("heading", { name: "Content" });
  await user.click(screen.getByRole("link", { name: "Settings" }));
  await screen.findByRole("heading", { name: "Settings" });
  expect(screen.queryByText("only-once-secret")).not.toBeInTheDocument();
});
