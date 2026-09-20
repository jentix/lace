import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { createAdminRouter, navigationFor, safeReturnPath } from "./app.js";
import { createStaticSessionSource, type AdminSessionSource } from "./session.js";

function renderRoute(path: string, sessionSource: AdminSessionSource) {
  const router = createAdminRouter(sessionSource, createMemoryHistory({ initialEntries: [path] }));
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

afterEach(() => {
  document.body.replaceChildren();
});

test("anonymous protected visits show only neutral loading before login redirect", async () => {
  let resolve: (value: null) => void = () => undefined;
  const pending = new Promise<null>((done) => {
    resolve = done;
  });
  const source: AdminSessionSource = {
    get: () => pending,
  };
  renderRoute("/content/posts/entry-123", source);

  expect(await screen.findByRole("status", { name: "Checking access" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Entry" })).not.toBeInTheDocument();
  resolve(null);
  await waitFor(() => expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument());
  expect(screen.queryByRole("heading", { name: "Entry" })).not.toBeInTheDocument();
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

test("typed route foundations render valid paths and reject malformed model keys", async () => {
  renderRoute(
    "/content/posts/entry-123",
    createStaticSessionSource({ id: "admin-1", role: "admin" }),
  );
  expect(await screen.findByRole("heading", { name: "Entry" })).toBeInTheDocument();

  document.body.replaceChildren();
  renderRoute("/content/INVALID", createStaticSessionSource({ id: "admin-1", role: "admin" }));
  expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
});

test("session adapter fails closed and uses same-origin credentials", async () => {
  const fetcher = vi.fn(async () => Response.json({ user: { id: "editor-1", role: "editor" } }));
  const { createBrowserSessionSource } = await import("./session.js");
  await expect(createBrowserSessionSource(fetcher).get()).resolves.toEqual({
    id: "editor-1",
    role: "editor",
  });
  expect(fetcher).toHaveBeenCalledWith("/api/auth/get-session", {
    credentials: "same-origin",
    headers: { accept: "application/json" },
  });
  await expect(
    createBrowserSessionSource(async () => new Response("bad", { status: 500 })).get(),
  ).resolves.toBeNull();
});

test("safe navigation helpers retain only local return paths and allowed links", () => {
  expect(safeReturnPath("/content/posts?view=list")).toBe("/content/posts?view=list");
  expect(safeReturnPath("//attacker.test")).toBe("/content");
  expect(navigationFor("admin").map((item) => item.label)).toEqual([
    "Content",
    "Media",
    "Builds",
    "Users",
    "Settings",
  ]);
  expect(navigationFor("editor").map((item) => item.label)).toEqual(["Content", "Media", "Builds"]);
});
