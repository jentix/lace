import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { expect, test } from "vitest";
import { AdminClientError } from "../../api/index.js";
import { PageAccessDenied, PageError, PageLoading, PagePlaceholder } from "./index.js";

function renderWithRouter(element: ReactElement) {
  const rootRoute = createRootRoute();
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/"] }),
    routeTree: rootRoute.addChildren([
      createRoute({ component: () => element, getParentRoute: () => rootRoute, path: "/" }),
      createRoute({ component: () => null, getParentRoute: () => rootRoute, path: "/content" }),
    ]),
  });
  render(<RouterProvider router={router as never} />);
}

test("renders loading, placeholder, and denial states with accessible names", async () => {
  renderWithRouter(
    <>
      <PageLoading label="Loading draft" />
      <PagePlaceholder description="This content model does not exist." title="Page not found" />
      <PageAccessDenied />
    </>,
  );
  expect(await screen.findByRole("status", { name: "Loading draft" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  const denied = screen.getByRole("region", { name: "Access denied" });
  expect(denied).toHaveTextContent("Your role does not have permission");
  expect(screen.getByRole("link", { name: "Go to Content" })).toHaveAttribute("href", "/content");
});

test("maps a failed request to a sanitized alert with its request id", () => {
  render(<PageError error={new AdminClientError({ message: "Denied.", requestId: "req-7" })} />);
  expect(screen.getByRole("alert")).toHaveTextContent("Denied.");
  expect(screen.getByText("Request ID: req-7")).toBeInTheDocument();
});
