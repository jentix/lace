import { screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import {
  draftEntry,
  entry,
  entryList,
  renderRoute,
  stubClient as client,
} from "../../../app/testing/index.js";
import { createStaticSessionSource } from "../../../entities/session/index.js";
import { AdminClientError } from "../../../shared/api/index.js";

afterEach(() => {
  vi.restoreAllMocks();
});

test("content landing explains no configured models without hiding API errors", async () => {
  renderRoute(
    "/content",
    createStaticSessionSource({ id: "admin-1", role: "admin" }),
    client({ listModels: async () => ({ items: [] }) }),
  );
  expect(
    await screen.findByRole("heading", { name: "No content models configured" }),
  ).toBeInTheDocument();
  expect(screen.getByText(/pnpm content:sync/)).toBeInTheDocument();

  document.body.replaceChildren();
  renderRoute(
    "/content",
    createStaticSessionSource({ id: "admin-1", role: "admin" }),
    client({
      listModels: async () => Promise.reject(new AdminClientError({ message: "API unavailable" })),
    }),
  );
  expect(await screen.findByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "No content models configured" }),
  ).not.toBeInTheDocument();
});

test("content landing guides missing page sync and opens the synced page editor and collection", async () => {
  const source = createStaticSessionSource({ id: "editor-1", role: "editor" });
  renderRoute("/content", source, client({ listEntries: async () => entryList() }));
  expect(await screen.findByRole("heading", { name: "Page draft missing" })).toBeInTheDocument();
  expect(screen.getByText(/pnpm content:sync/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "posts" })).toBeInTheDocument();

  document.body.replaceChildren();
  const synced = renderRoute(
    "/content",
    source,
    client({
      listEntries: async (key) =>
        key === "home" ? entryList([{ ...entry, id: "home-1", modelKey: "home" }]) : entryList(),
      loadEntry: async () => ({
        ...draftEntry,
        id: "home-1",
        model: { key: "home", kind: "page", path: "/" },
        draft: { ...draftEntry.draft, entryId: "home-1" },
      }),
    }),
  );
  expect(await screen.findByRole("link", { name: "home" })).toBeInTheDocument();
  await synced.navigate({ params: { modelKey: "posts" }, to: "/content/$modelKey" });
  expect(await screen.findByRole("heading", { name: "posts" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Create entry/ })).toBeInTheDocument();
  expect(screen.getByText(/run pnpm content:sync first/)).toBeInTheDocument();
  await synced.navigate({
    params: { entryId: "home-1", modelKey: "home" },
    to: "/content/$modelKey/$entryId",
  });
  expect(await screen.findByRole("heading", { name: "Edit home" })).toBeInTheDocument();
});

test("remote models link pages directly and collections to their entry lists", async () => {
  renderRoute("/content", createStaticSessionSource({ id: "editor-1", role: "editor" }));

  expect(await screen.findByRole("link", { name: "home" })).toHaveAttribute(
    "href",
    "/admin/content/home/home-1",
  );
  expect(screen.getByRole("link", { name: "posts" })).toHaveAttribute(
    "href",
    "/admin/content/posts",
  );
});
