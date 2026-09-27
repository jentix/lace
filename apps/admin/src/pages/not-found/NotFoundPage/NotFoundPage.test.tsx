import { screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { renderInRouter } from "../../../app/testing/index.js";
import { NotFoundPage, StandaloneNotFoundPage } from "./index.js";

test("explains an unknown admin route and links back to Content", async () => {
  renderInRouter(<NotFoundPage />);
  const region = await screen.findByRole("region", { name: "Page not found" });
  expect(region).toHaveTextContent("does not match any screen");
  expect(screen.getByRole("link", { name: "Go to Content" })).toHaveAttribute("href", "/content");
  expect(screen.queryByRole("main")).not.toBeInTheDocument();
});

test("the router-level fallback supplies its own main landmark", async () => {
  renderInRouter(<StandaloneNotFoundPage />);
  const heading = await screen.findByRole("heading", { name: "Page not found" });
  expect(screen.getByRole("main")).toContainElement(heading);
});
