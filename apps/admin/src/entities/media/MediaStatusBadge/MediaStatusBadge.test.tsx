import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { MediaStatusBadge } from "./index.js";

test("lifecycle statuses read as active, pending deletion, or failed deletion", () => {
  render(
    <>
      <MediaStatusBadge status="active" />
      <MediaStatusBadge status="deleting" />
      <MediaStatusBadge status="delete_failed" />
    </>,
  );
  expect(screen.getByText("Active")).toBeInTheDocument();
  expect(screen.getByText("Deletion pending")).toBeInTheDocument();
  expect(screen.getByText("Deletion failed")).toBeInTheDocument();
});
