import { screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { renderRoute, stubClient } from "../../../app/testing/index.js";
import { createStaticSessionSource } from "../../../entities/session/index.js";
import { AdminClientError } from "../../../shared/api/index.js";

const editor = createStaticSessionSource({ id: "editor-1", role: "editor" });

test("routes collections to their entry list and pages back to the landing route", async () => {
  renderRoute("/content/posts", editor);
  expect(await screen.findByRole("table", { name: "posts entries" })).toBeInTheDocument();

  document.body.replaceChildren();
  renderRoute("/content/home", editor);
  expect(await screen.findByRole("heading", { name: "home" })).toBeInTheDocument();
  expect(screen.getByText("Open this page from the content landing route.")).toBeInTheDocument();
});

test("reports unknown models and failed model loads without an entry list", async () => {
  renderRoute("/content/missing", editor);
  expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();

  document.body.replaceChildren();
  renderRoute(
    "/content/posts",
    editor,
    stubClient({
      listModels: async () => Promise.reject(new AdminClientError({ message: "API unavailable" })),
    }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("API unavailable");
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
});
