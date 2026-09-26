import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { logOut, renderRoute, stubClient as client } from "../testing/index.js";
import { AdminApp } from "./index.js";
import {
  createStaticSessionSource,
  type AdminSessionSource,
} from "../../entities/session/index.js";
import { AdminClientError } from "../../shared/api/index.js";
import { safeReturnPath } from "../../shared/lib/index.js";

afterEach(() => {
  vi.restoreAllMocks();
});

test("anonymous protected visits show only neutral loading before login redirect", async () => {
  let resolve: (value: null) => void = () => undefined;
  const pending = new Promise<null>((done) => {
    resolve = done;
  });
  const source: AdminSessionSource = {
    get: () => pending,
    invalidate: () => undefined,
  };
  renderRoute("/content/posts/entry-123", source);

  expect(await screen.findByRole("status", { name: "Checking access" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Entry" })).not.toBeInTheDocument();
  resolve(null);
  await waitFor(() => expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument());
  expect(screen.queryByRole("heading", { name: "Entry" })).not.toBeInTheDocument();
});

test("admin root redirects through the session guard and user-menu logout clears the session", async () => {
  const user = userEvent.setup();
  let current: { id: string; role: "admin" } | null = { id: "admin-1", role: "admin" };
  const source: AdminSessionSource = { get: async () => current, invalidate: () => undefined };
  const signOut = vi.fn(async () => {
    current = null;
  });
  renderRoute("/", source, client({ signOut }));
  expect(await screen.findByRole("heading", { name: "Content" })).toBeInTheDocument();
  await logOut(user);
  expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  expect(signOut).toHaveBeenCalledOnce();
  document.body.replaceChildren();
  renderRoute("/", createStaticSessionSource(null));
  expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Content" })).not.toBeInTheDocument();
});

test("typed route foundations render valid paths and reject malformed model keys", async () => {
  renderRoute(
    "/content/posts/entry-123",
    createStaticSessionSource({ id: "admin-1", role: "admin" }),
  );
  expect(await screen.findByRole("heading", { name: "Edit posts" })).toBeInTheDocument();

  document.body.replaceChildren();
  renderRoute("/content/INVALID", createStaticSessionSource({ id: "admin-1", role: "admin" }));
  expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
});

test("safe navigation helpers retain only local return paths", () => {
  expect(safeReturnPath("/content/posts?view=list")).toBe("/content/posts?view=list");
  expect(safeReturnPath("//attacker.test")).toBe("/content");
});

test("an expired-session response removes protected content during recovery", async () => {
  let session: { id: string; role: "editor" } | null = { id: "editor-1", role: "editor" };
  const source: AdminSessionSource = {
    get: async () => session,
    invalidate: () => {
      session = null;
    },
  };
  renderRoute(
    "/content",
    source,
    client({
      listModels: async () => {
        throw new AdminClientError({ message: "Session expired", status: 403 });
      },
    }),
  );

  expect(await screen.findByRole("status", { name: "Checking access" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Content" })).not.toBeInTheDocument();
});

test("the application component mounts providers and guards the admin entry", async () => {
  window.history.replaceState(null, "", "/admin/content");
  render(<AdminApp client={client()} sessionSource={createStaticSessionSource(null)} />);
  expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  expect(window.location.pathname).toBe("/admin/login");
  window.history.replaceState(null, "", "/");
});
