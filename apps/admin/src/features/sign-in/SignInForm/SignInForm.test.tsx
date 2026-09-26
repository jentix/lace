import { screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { renderInRouter, stubClient } from "../../../app/testing/index.js";
import { AdminClientError } from "../../../shared/api/index.js";
import { SignInForm } from "./index.js";

test("submits credentials, refreshes the session, and continues to the requested route", async () => {
  const user = userEvent.setup();
  const signIn = vi.fn(async () => undefined);
  const invalidate = vi.fn();
  const get = vi.fn(async () => null);
  const { router } = renderInRouter(<SignInForm redirectTo="/content" />, {
    client: stubClient({ signIn }),
    sessionSource: { get, invalidate },
  });

  await user.type(await screen.findByLabelText("Email"), "editor@lace.test");
  await user.type(screen.getByLabelText("Password"), "correct horse battery staple");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByText("Route /content")).toBeInTheDocument();
  expect(signIn).toHaveBeenCalledWith("editor@lace.test", "correct horse battery staple");
  expect(invalidate).toHaveBeenCalled();
  expect(router.state.location.pathname).toBe("/content");
});

test("keeps the form and shows a sanitized failure when sign-in is rejected", async () => {
  const user = userEvent.setup();
  renderInRouter(<SignInForm redirectTo="/content" />, {
    client: stubClient({
      signIn: async () => {
        throw new AdminClientError({ message: "Invalid email or password.", requestId: "req-9" });
      },
    }),
  });

  await user.type(await screen.findByLabelText("Email"), "editor@lace.test");
  await user.type(screen.getByLabelText("Password"), "wrong password");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid email or password."),
  );
  expect(screen.getByLabelText("Email")).toHaveValue("editor@lace.test");
});
