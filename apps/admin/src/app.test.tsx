import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { createAdminRouter, navigationFor, safeReturnPath } from "./app.js";
import { AdminClientError, type AdminClient } from "./admin-client.js";
import type { ContentModelDto } from "@lacecms/contracts";
import { createStaticSessionSource, type AdminSessionSource } from "./session.js";

const models = {
  items: [
    { blocks: [], fields: {}, key: "home", kind: "page" as const, path: "/", version: 1 },
    {
      blocks: [],
      fields: {},
      key: "posts",
      kind: "collection" as const,
      route: "/posts/:slug",
      version: 1,
    },
  ],
};

const entry = {
  draftRevision: 2,
  id: "entry-1",
  modelKey: "posts",
  title: "First post",
  updatedAt: "2026-09-20T00:00:00.000Z",
};
const draftEntry = {
  draft: {
    blocks: [],
    createdAt: "2026-09-20T00:00:00.000Z",
    entryId: "entry-1",
    fields: {},
    id: "snapshot-1",
    revision: 2,
    state: "draft" as const,
    title: "First post",
    updatedAt: "2026-09-20T00:00:00.000Z",
    updatedBy: { id: "editor-1", role: "admin" as const },
  },
  id: "entry-1",
  model: { key: "posts", kind: "collection" as const, route: "/posts/:slug" },
};

function client(overrides: Partial<AdminClient> = {}): AdminClient {
  return {
    createEntry: async () => ({}) as never,
    deleteEntry: async () => undefined,
    loadEntry: async () => draftEntry,
    listEntries: async (modelKey) =>
      modelKey === "home"
        ? { items: [{ ...entry, id: "home-1", modelKey: "home", title: "Home" }] }
        : { items: [entry] },
    listModels: async () => models,
    signIn: async () => undefined,
    signOut: async () => undefined,
    saveDraft: async () => ({}) as never,
    ...overrides,
  };
}

function renderRoute(path: string, sessionSource: AdminSessionSource, adminClient = client()) {
  const router = createAdminRouter(
    sessionSource,
    createMemoryHistory({ initialEntries: [path] }),
    adminClient,
  );
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
    invalidate: () => undefined,
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
  expect(await screen.findByRole("heading", { name: "Edit posts" })).toBeInTheDocument();

  document.body.replaceChildren();
  renderRoute("/content/INVALID", createStaticSessionSource({ id: "admin-1", role: "admin" }));
  expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
});

test("entry editor keeps an incompatible entry or failed load out of an editable form", async () => {
  renderRoute(
    "/content/posts/entry-1",
    createStaticSessionSource({ id: "admin-1", role: "admin" }),
    client({
      loadEntry: async () => ({ ...draftEntry, model: { key: "home", kind: "page", path: "/" } }),
    }),
  );
  expect(await screen.findByRole("heading", { name: "Entry not found" })).toBeInTheDocument();
  expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();

  document.body.replaceChildren();
  renderRoute(
    "/content/posts/entry-1",
    createStaticSessionSource({ id: "admin-1", role: "admin" }),
    client({
      loadEntry: async () => Promise.reject(new AdminClientError({ message: "Not found." })),
    }),
  );
  expect(await screen.findByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
  expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
});

test("entry editor renders metadata fields, preserves blocks, suggests a slug, and saves one complete draft", async () => {
  const user = userEvent.setup();
  const saveDraft = vi.fn(
    async (_entryId: string, input: Parameters<AdminClient["saveDraft"]>[1]) => ({
      ...draftEntry,
      draft: { ...draftEntry.draft, ...input, revision: 3 },
    }),
  ) as unknown as AdminClient["saveDraft"];
  const editorModel: ContentModelDto = {
    blocks: [],
    fields: {
      date: { required: false, type: "date" as const },
      datetime: { required: false, type: "datetime" as const },
      enabled: { defaultValue: false, required: false, type: "boolean" as const },
      hero: { required: false, type: "media" as const },
      link: { required: false, type: "url" as const },
      richBody: { required: false, type: "richText" as const },
      score: { max: 5, min: 1, required: false, type: "number" as const },
      summary: { minLength: 3, required: true, type: "textarea" as const },
      teaser: { required: false, type: "text" as const },
      topic: { options: ["news", "release"], required: false, type: "select" as const },
    },
    key: "posts",
    kind: "collection",
    route: "/posts/:slug",
    version: 1,
  };
  renderRoute(
    "/content/posts/entry-1",
    createStaticSessionSource({ id: "editor-1", role: "editor" }),
    client({
      listModels: async () => ({ items: [models.items[0]!, editorModel] }) as never,
      loadEntry: async () => ({
        ...draftEntry,
        draft: { ...draftEntry.draft, fields: { summary: "Draft" } },
      }),
      saveDraft,
    }),
  );

  await screen.findByRole("heading", { name: "Edit posts" });
  expect(screen.getByLabelText("Summary")).toBeInstanceOf(HTMLTextAreaElement);
  expect(screen.getByLabelText("Rich Body")).toBeInstanceOf(HTMLTextAreaElement);
  expect(screen.getByLabelText("Enabled")).toHaveAttribute("type", "checkbox");
  expect(screen.getByLabelText("Score")).toHaveAttribute("type", "number");
  expect(screen.getByLabelText("Date")).toHaveAttribute("type", "date");
  expect(screen.getByLabelText("Datetime")).toHaveAttribute("type", "text");
  expect(screen.getByLabelText("Link")).toHaveAttribute("type", "url");
  expect(screen.getByLabelText("Hero")).toHaveAttribute("type", "text");
  await user.click(screen.getByLabelText("Suggest from title"));
  await user.clear(screen.getByLabelText("Title"));
  await user.type(screen.getByLabelText("Title"), "Release notes");
  expect(screen.getByLabelText("Slug")).toHaveValue("release-notes");
  await user.selectOptions(screen.getByLabelText("Topic"), "release");
  await user.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() =>
    expect(saveDraft).toHaveBeenCalledWith(
      "entry-1",
      expect.objectContaining({
        expectedRevision: 2,
        fields: expect.objectContaining({ topic: "release" }),
      }),
    ),
  );
  expect(await screen.findByText("Saved revision 3")).toBeInTheDocument();
});

test("entry editor prevents invalid local submission and keeps manual slug edits", async () => {
  const user = userEvent.setup();
  const saveDraft = vi.fn(async () => draftEntry);
  const editorModel: ContentModelDto = {
    blocks: [],
    fields: { summary: { minLength: 5, required: false, type: "text" as const } },
    key: "posts",
    kind: "collection",
    route: "/posts/:slug",
    version: 1,
  };
  renderRoute(
    "/content/posts/entry-1",
    createStaticSessionSource({ id: "editor-1", role: "editor" }),
    client({
      listModels: async () => ({ items: [models.items[0]!, editorModel] }) as never,
      saveDraft,
    }),
  );
  await screen.findByRole("heading", { name: "Edit posts" });
  await user.click(screen.getByLabelText("Suggest from title"));
  await user.clear(screen.getByLabelText("Slug"));
  await user.type(screen.getByLabelText("Slug"), "manual-slug");
  await user.clear(screen.getByLabelText("Title"));
  await user.type(screen.getByLabelText("Title"), "Another post");
  expect(screen.getByLabelText("Slug")).toHaveValue("manual-slug");
  await user.click(screen.getByLabelText("Suggest from title"));
  await user.click(screen.getByLabelText("Suggest from title"));
  expect(screen.getByLabelText("Slug")).toHaveValue("another-post");
  await user.type(screen.getByLabelText("Summary"), "bad");
  await user.click(screen.getByRole("button", { name: "Save draft" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("does not conform");
  expect(saveDraft).not.toHaveBeenCalled();
});

test("page editors omit the collection slug controls", async () => {
  renderRoute(
    "/content/home/home-1",
    createStaticSessionSource({ id: "editor-1", role: "editor" }),
    client({
      loadEntry: async () => ({
        ...draftEntry,
        id: "home-1",
        model: { key: "home", kind: "page", path: "/" },
      }),
    }),
  );
  await screen.findByRole("heading", { name: "Edit home" });
  expect(screen.queryByLabelText("Slug")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Suggest from title")).not.toBeInTheDocument();
});

test("dirty entry navigation requires an explicit leave-or-stay choice without autosaving", async () => {
  const user = userEvent.setup();
  const saveDraft = vi.fn(async () => draftEntry);
  const editorModel: ContentModelDto = {
    blocks: [],
    fields: { summary: { required: false, type: "text" } },
    key: "posts",
    kind: "collection",
    route: "/posts/:slug",
    version: 1,
  };
  renderRoute(
    "/content/posts/entry-1",
    createStaticSessionSource({ id: "editor-1", role: "editor" }),
    client({
      listModels: async () => ({ items: [models.items[0]!, editorModel] }) as never,
      saveDraft,
    }),
  );
  await screen.findByRole("heading", { name: "Edit posts" });
  await user.type(screen.getByLabelText("Summary"), "Keep this");
  await user.click(screen.getByRole("link", { name: "Content" }));
  expect(
    await screen.findByRole("alertdialog", { name: "Discard unsaved changes?" }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Stay" }));
  expect(screen.getByLabelText("Summary")).toHaveValue("Keep this");
  expect(saveDraft).not.toHaveBeenCalled();
});

test("server validation issues remain on their field and keep the draft editable", async () => {
  const user = userEvent.setup();
  const editorModel: ContentModelDto = {
    blocks: [],
    fields: { summary: { required: false, type: "text" } },
    key: "posts",
    kind: "collection",
    route: "/posts/:slug",
    version: 1,
  };
  renderRoute(
    "/content/posts/entry-1",
    createStaticSessionSource({ id: "editor-1", role: "editor" }),
    client({
      listModels: async () => ({ items: [models.items[0]!, editorModel] }) as never,
      saveDraft: async () => {
        throw new AdminClientError({
          issues: [
            { code: "invalid_value", message: "Summary is unavailable.", path: "/fields/summary" },
          ],
          message: "The draft was rejected.",
          status: 422,
        });
      },
    }),
  );
  await screen.findByRole("heading", { name: "Edit posts" });
  await user.type(screen.getByLabelText("Summary"), "Retain me");
  await user.click(screen.getByRole("button", { name: "Save draft" }));
  expect(await screen.findByText("Summary is unavailable.")).toHaveAttribute("role", "alert");
  expect(screen.getByLabelText("Summary")).toHaveValue("Retain me");
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

test("remote models link pages directly and collections to their entry lists", async () => {
  renderRoute("/content", createStaticSessionSource({ id: "editor-1", role: "editor" }));

  expect(await screen.findByRole("link", { name: "home" })).toHaveAttribute(
    "href",
    "/content/home/home-1",
  );
  expect(screen.getByRole("link", { name: "posts" })).toHaveAttribute("href", "/content/posts");
});

test("collection lists keep cursors opaque and expose permitted mutations", async () => {
  const user = userEvent.setup();
  const listEntries = vi.fn(async (_modelKey: string, cursor?: string) =>
    cursor === undefined
      ? { items: [entry], nextCursor: "opaque+/=" }
      : { items: [{ ...entry, id: "entry-2", title: "Second post" }] },
  );
  renderRoute(
    "/content/posts",
    createStaticSessionSource({ id: "editor-1", role: "editor" }),
    client({ listEntries }),
  );

  expect(await screen.findByRole("table", { name: "posts entries" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Load more entries" }));
  expect(await screen.findByText("Second post")).toBeInTheDocument();
  expect(listEntries).toHaveBeenLastCalledWith("posts", "opaque+/=");
  expect(screen.getByRole("button", { name: "Create entry" })).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Delete" })).toHaveLength(2);
});

test("viewers see content but not collection mutations", async () => {
  renderRoute("/content/posts", createStaticSessionSource({ id: "viewer-1", role: "viewer" }));
  await screen.findByRole("table", { name: "posts entries" });
  expect(screen.queryByRole("button", { name: "Create entry" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
});

test("entry creation and confirmed deletion refresh the active collection list", async () => {
  const user = userEvent.setup();
  const createEntry = vi.fn(async () => ({}) as never);
  const deleteEntry = vi.fn(async () => undefined);
  const listEntries = vi.fn(async () => ({ items: [entry] }));
  renderRoute(
    "/content/posts",
    createStaticSessionSource({ id: "editor-1", role: "editor" }),
    client({ createEntry, deleteEntry, listEntries }),
  );
  await screen.findByRole("table", { name: "posts entries" });

  await user.click(screen.getByRole("button", { name: "Create entry" }));
  const createDialog = screen.getByRole("dialog", { name: "Create entry" });
  await user.type(within(createDialog).getByLabelText("Title"), "New post");
  await user.click(within(createDialog).getByRole("button", { name: "Create entry" }));
  await waitFor(() => expect(createEntry).toHaveBeenCalledWith("posts", "New post"));
  await waitFor(() => expect(listEntries).toHaveBeenCalledTimes(2));

  await user.click(screen.getByRole("button", { name: "Delete" }));
  const deleteDialog = screen.getByRole("dialog", { name: "Delete entry" });
  await user.click(within(deleteDialog).getByRole("button", { name: "Confirm deletion" }));
  await waitFor(() => expect(deleteEntry).toHaveBeenCalledWith("entry-1", 2));
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
  await user.click(screen.getByRole("button", { name: "Sign out" }));
  expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
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
