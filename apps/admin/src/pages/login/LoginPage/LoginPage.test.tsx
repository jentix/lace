import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { renderRoute, stubClient as client } from "../../../app/testing/index.js";
import { type AdminSessionSource } from "../../../entities/session/index.js";

afterEach(() => {
  vi.restoreAllMocks();
});

test("sign-in returns to a safe route and sign-out clears the session", async () => {
  const user = userEvent.setup();
  let session: { id: string; role: "editor" } | null = null;
  const source: AdminSessionSource = {
    get: async () => session,
    invalidate: () => undefined,
  };
  renderRoute(
    "/login?redirect=/content/posts",
    source,
    client({
      signIn: async () => {
        session = { id: "editor-1", role: "editor" };
      },
      signOut: async () => {
        session = null;
      },
    }),
  );

  await user.type(await screen.findByLabelText("Email"), "editor@example.test");
  await user.type(screen.getByLabelText("Password"), "correct horse battery staple");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByRole("heading", { name: "posts" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Log out" }));
  expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
});
