import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { AdminClientError } from "../../api/index.js";
import { PageAccessDenied, PageError, PageLoading, PagePlaceholder } from "./index.js";

test("renders loading, placeholder, and denial states with accessible names", () => {
  render(
    <>
      <PageLoading label="Loading draft" />
      <PagePlaceholder description="This content model does not exist." title="Page not found" />
      <PageAccessDenied />
    </>,
  );
  expect(screen.getByRole("status", { name: "Loading draft" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Access denied" })).toBeInTheDocument();
});

test("maps a failed request to a sanitized alert with its request id", () => {
  render(<PageError error={new AdminClientError({ message: "Denied.", requestId: "req-7" })} />);
  expect(screen.getByRole("alert")).toHaveTextContent("Denied.");
  expect(screen.getByText("Request ID: req-7")).toBeInTheDocument();
});
