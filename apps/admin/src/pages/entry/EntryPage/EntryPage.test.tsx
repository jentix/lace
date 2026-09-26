import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import type { ContentModelDto } from "@lacecms/contracts";
import {
  draftEntry,
  mediaItem,
  models,
  renderRoute,
  stubClient as client,
} from "../../../app/testing/index.js";
import { createStaticSessionSource } from "../../../entities/session/index.js";
import { AdminClientError, type AdminClient } from "../../../shared/api/index.js";

afterEach(() => {
  vi.restoreAllMocks();
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
  expect(screen.getByRole("textbox", { name: "Rich Body" })).toBeInTheDocument();
  expect(screen.getByRole("switch", { name: "Enabled" })).toHaveAttribute("aria-checked", "false");
  expect(screen.getByLabelText("Score")).toHaveAttribute("type", "number");
  expect(screen.getByRole("button", { name: "Date" })).toHaveTextContent("Pick a date");
  expect(screen.getByRole("button", { name: "Datetime" })).toHaveTextContent("Pick a date");
  expect(screen.getByLabelText("Datetime time (UTC)")).toBeDisabled();
  expect(screen.getByLabelText("Link")).toHaveAttribute("type", "url");
  expect(screen.getByRole("combobox", { name: "Topic" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Choose media for Hero" })).toBeInTheDocument();
  await user.click(screen.getByLabelText("Suggest from title"));
  await user.clear(screen.getByLabelText("Title"));
  await user.type(screen.getByLabelText("Title"), "Release notes");
  expect(screen.getByLabelText("Slug")).toHaveValue("release-notes");
  await user.click(screen.getByRole("switch", { name: "Enabled" }));
  screen.getByRole("combobox", { name: "Topic" }).focus();
  await user.keyboard("{Enter}");
  await user.click(await screen.findByRole("option", { name: "release" }));
  await user.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() =>
    expect(saveDraft).toHaveBeenCalledWith(
      "entry-1",
      expect.objectContaining({
        expectedRevision: 2,
        fields: expect.objectContaining({ enabled: true, topic: "release" }),
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

test("entry editor shows separate draft and publication facts without offering publish to editors", async () => {
  renderRoute(
    "/content/posts/entry-1",
    createStaticSessionSource({ id: "editor-1", role: "editor" }),
    client({
      loadEntry: async () => ({
        ...draftEntry,
        draft: { ...draftEntry.draft, revision: 4, slug: "draft-post" },
        published: {
          ...draftEntry.draft,
          id: "published-1",
          revision: 3,
          slug: "published-post",
          state: "published" as const,
        },
      }),
    }),
  );
  await screen.findByRole("heading", { name: "Edit posts" });
  const publication = screen.getByRole("region", { name: "Publication status" });
  expect(publication).toHaveTextContent("LiveRevision 3");
  expect(publication).toHaveTextContent("DraftRevision 4");
  expect(publication).toHaveTextContent("Last editededitor@lace.test");
  expect(publication).toHaveTextContent("/posts/published-post");
  expect(publication).toHaveTextContent("No build requested from this editor.");
  expect(publication).not.toHaveTextContent("editor-1");
  expect(publication).not.toHaveTextContent("2026-09-20T00:00:00.000Z");
  expect(screen.queryByRole("button", { name: "Publish" })).not.toBeInTheDocument();
});

test("admin confirms publication and sees an independent pending-build outcome", async () => {
  const user = userEvent.setup();
  const publishEntry = vi.fn(async () => ({
    build: { status: "accepted" as const },
    entry: {
      ...draftEntry,
      published: { ...draftEntry.draft, id: "published-1", state: "published" as const },
    },
    publication: "published" as const,
  }));
  renderRoute(
    "/content/posts/entry-1",
    createStaticSessionSource({ id: "admin-1", role: "admin" }),
    client({ publishEntry }),
  );
  await screen.findByRole("heading", { name: "Edit posts" });
  await user.click(screen.getByRole("button", { name: "Publish" }));
  const dialog = screen.getByRole("dialog", { name: "Publish this entry?" });
  await user.click(within(dialog).getByRole("button", { name: "Confirm publication" }));
  await waitFor(() => expect(publishEntry).toHaveBeenCalledTimes(1));
  expect(publishEntry).toHaveBeenCalledWith(
    "entry-1",
    expect.objectContaining({ expectedRevision: 2, idempotencyKey: expect.any(String) }),
  );
  expect(await screen.findByText("Published. Build pending.")).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Publication status" })).toHaveTextContent("Published");
});

test("publish retries an uncertain network outcome with the same attempt key", async () => {
  const user = userEvent.setup();
  const publishEntry = vi
    .fn()
    .mockRejectedValueOnce(new AdminClientError({ message: "The Lace API could not be reached." }))
    .mockResolvedValueOnce({
      build: { status: "unavailable" as const },
      entry: draftEntry,
      publication: "published" as const,
    });
  renderRoute(
    "/content/posts/entry-1",
    createStaticSessionSource({ id: "admin-1", role: "admin" }),
    client({ publishEntry }),
  );
  await screen.findByRole("heading", { name: "Edit posts" });
  await user.click(screen.getByRole("button", { name: "Publish" }));
  await user.click(
    within(screen.getByRole("dialog", { name: "Publish this entry?" })).getByRole("button", {
      name: "Confirm publication",
    }),
  );
  await screen.findByRole("button", { name: "Retry publish" });
  await user.click(screen.getByRole("button", { name: "Retry publish" }));
  await waitFor(() => expect(publishEntry).toHaveBeenCalledTimes(2));
  expect(publishEntry.mock.calls[1]![1]).toEqual(publishEntry.mock.calls[0]![1]);
  expect(
    await screen.findByText("Published, but build dispatch is currently unavailable."),
  ).toBeInTheDocument();
});

test("a publish revision conflict leaves the loaded form available for explicit recovery", async () => {
  const user = userEvent.setup();
  renderRoute(
    "/content/posts/entry-1",
    createStaticSessionSource({ id: "admin-1", role: "admin" }),
    client({
      publishEntry: async () => {
        throw new AdminClientError({
          code: "CONTENT_REVISION_CONFLICT",
          message: "The draft was modified by another request.",
          status: 409,
        });
      },
    }),
  );
  await screen.findByRole("heading", { name: "Edit posts" });
  await user.click(screen.getByRole("button", { name: "Publish" }));
  await user.click(
    within(screen.getByRole("dialog", { name: "Publish this entry?" })).getByRole("button", {
      name: "Confirm publication",
    }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("Draft changed elsewhere");
  expect(screen.getByLabelText("Title")).toHaveValue("First post");
});

test("a later draft save preserves the published public output", async () => {
  const user = userEvent.setup();
  const initiallyPublished = {
    ...draftEntry,
    draft: { ...draftEntry.draft, revision: 4, slug: "draft-path" },
    published: {
      ...draftEntry.draft,
      id: "published-1",
      revision: 3,
      slug: "published-path",
      state: "published" as const,
    },
  };
  renderRoute(
    "/content/posts/entry-1",
    createStaticSessionSource({ id: "admin-1", role: "admin" }),
    client({
      loadEntry: async () => initiallyPublished,
      saveDraft: async (_entryId, input) =>
        ({
          ...initiallyPublished,
          draft: { ...initiallyPublished.draft, ...input, revision: 5 },
        }) as never,
    }),
  );
  await screen.findByRole("heading", { name: "Edit posts" });
  await user.clear(screen.getByLabelText("Title"));
  await user.type(screen.getByLabelText("Title"), "Later draft");
  await user.click(screen.getByRole("button", { name: "Save draft" }));
  expect(await screen.findByText("Saved revision 5")).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Publication status" })).toHaveTextContent(
    "/posts/published-path",
  );
  expect(screen.getByRole("region", { name: "Publication status" })).toHaveTextContent(
    "DraftRevision 5",
  );
});

test("revision conflicts retain local values until reload and copying changes nothing", async () => {
  const user = userEvent.setup();
  const loadEntry = vi
    .fn()
    .mockResolvedValueOnce(draftEntry)
    .mockResolvedValueOnce({
      ...draftEntry,
      draft: { ...draftEntry.draft, title: "Server title" },
    });
  const clipboard = { writeText: vi.fn(async () => undefined) };
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: clipboard });
  renderRoute(
    "/content/posts/entry-1",
    createStaticSessionSource({ id: "editor-1", role: "editor" }),
    client({
      loadEntry,
      saveDraft: async () => {
        throw new AdminClientError({
          code: "CONTENT_REVISION_CONFLICT",
          message: "The draft was modified by another request.",
          status: 409,
        });
      },
    }),
  );
  await screen.findByRole("heading", { name: "Edit posts" });
  await user.clear(screen.getByLabelText("Title"));
  await user.type(screen.getByLabelText("Title"), "Keep local");
  await user.click(screen.getByRole("button", { name: "Save draft" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Draft changed elsewhere");
  expect(screen.getByLabelText("Title")).toHaveValue("Keep local");
  await user.click(screen.getByRole("button", { name: "Copy my JSON" }));
  await waitFor(() =>
    expect(clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("Keep local")),
  );
  expect(screen.getByLabelText("Title")).toHaveValue("Keep local");
  expect(loadEntry).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole("button", { name: "Reload server draft" }));
  await waitFor(() => expect(loadEntry).toHaveBeenCalledTimes(2));
  expect(await screen.findByLabelText("Title")).toHaveValue("Server title");
  expect(screen.queryByText("Draft changed elsewhere")).not.toBeInTheDocument();
});

test("rich-text controls reject an unsafe link before save", async () => {
  const user = userEvent.setup();
  const saveDraft = vi.fn(async () => draftEntry);
  const editorModel: ContentModelDto = {
    blocks: [],
    fields: { body: { required: false, type: "richText" } },
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
  vi.spyOn(window, "prompt").mockReturnValue("javascript:alert(1)");
  await user.click(screen.getByRole("button", { name: "Link" }));
  await user.click(screen.getByRole("button", { name: "Save draft" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("does not conform");
  expect(saveDraft).not.toHaveBeenCalled();
});

test("a server-normalized media draft becomes clean after save", async () => {
  const user = userEvent.setup();
  const model: ContentModelDto = {
    blockDefinitions: [
      {
        fields: {
          alt: { required: true, type: "text" },
          caption: { required: false, type: "text" },
          media: { required: true, type: "media" },
        },
        type: "image",
        version: 1,
      },
    ],
    blocks: ["image"],
    fields: {
      heroImage: { required: false, type: "media" },
      publishedAt: { required: true, type: "date" },
    },
    key: "posts",
    kind: "collection",
    route: "/posts/:slug",
    version: 1,
  };
  const saveDraft = vi.fn(async (_id: string, input: Parameters<AdminClient["saveDraft"]>[1]) => ({
    ...draftEntry,
    draft: {
      ...draftEntry.draft,
      blocks: input.blocks.map((block) => ({
        ...block,
        data: { alt: "Test image", media: mediaItem.id },
      })),
      fields: { heroImage: mediaItem.id, publishedAt: "2026-09-25" },
      revision: 3,
      slug: "media-reuse-test",
    },
  })) as unknown as AdminClient["saveDraft"];
  renderRoute(
    "/content/posts/entry-1",
    createStaticSessionSource({ id: "editor-1", role: "editor" }),
    client({
      listMedia: async () => ({ items: [mediaItem] }),
      listModels: async () => ({ items: [model] }),
      saveDraft,
    }),
  );
  await screen.findByRole("heading", { name: "Edit posts" });
  await user.click(screen.getByRole("button", { name: "Choose media for Hero Image" }));
  await user.click(
    await within(screen.getByRole("dialog", { name: "Choose media for Hero Image" })).findByRole(
      "button",
      { name: "cover.png" },
    ),
  );
  expect(
    await screen.findByRole("button", { name: "Replace media for Hero Image" }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Add Image" }));
  await user.type(screen.getByRole("textbox", { name: "Alt" }), "Test image");
  await user.click(screen.getByRole("button", { name: "Choose media for Media" }));
  await user.click(
    await within(screen.getByRole("dialog", { name: "Choose media for Media" })).findByRole(
      "button",
      { name: "cover.png" },
    ),
  );
  expect(
    await screen.findByRole("button", { name: "Replace media for Media" }),
  ).toBeInTheDocument();
  expect(screen.getAllByText("cover.png")).toHaveLength(2);
  await user.type(screen.getByRole("textbox", { name: "Slug" }), "media-reuse-test");
  fireEvent.change(screen.getByLabelText("Published At"), { target: { value: "2026-09-25" } });
  await user.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(1));
  expect(await screen.findByText("Saved revision 3")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
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
  await user.click(
    within(screen.getByRole("complementary", { name: "Admin navigation" })).getByRole("link", {
      name: "Content",
    }),
  );
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

test("header actions sit in the shell header and the save shortcut saves once", async () => {
  const user = userEvent.setup();
  const saveDraft = vi.fn(async (_id: string, input: Parameters<AdminClient["saveDraft"]>[1]) => ({
    ...draftEntry,
    draft: { ...draftEntry.draft, ...input, revision: 3 },
  })) as unknown as AdminClient["saveDraft"];
  renderRoute(
    "/content/posts/entry-1",
    createStaticSessionSource({ id: "editor-1", role: "editor" }),
    client({ saveDraft }),
  );
  await screen.findByRole("heading", { name: "Edit posts" });
  const header = screen.getByRole("banner");
  const save = within(header).getByRole("button", { name: "Save draft" });
  expect(save).toBeDisabled();
  expect(within(header).getByRole("status")).toHaveTextContent("Saved revision 2");
  expect(within(screen.getByRole("main")).queryByRole("button", { name: "Save draft" })).toBe(null);
  await user.keyboard("{Control>}s{/Control}");
  expect(saveDraft).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText("Title"), " again");
  expect(within(header).getByRole("status")).toHaveTextContent("Unsaved changes");
  const event = new KeyboardEvent("keydown", { cancelable: true, ctrlKey: true, key: "s" });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(1));
  expect(saveDraft).toHaveBeenCalledWith(
    "entry-1",
    expect.objectContaining({ expectedRevision: 2, title: "First post again" }),
  );
  expect(await within(header).findByRole("status")).toHaveTextContent("Saved revision 3");
});

test("a failed save keeps local changes and reads as not saved", async () => {
  const user = userEvent.setup();
  renderRoute(
    "/content/posts/entry-1",
    createStaticSessionSource({ id: "editor-1", role: "editor" }),
    client({
      saveDraft: async () => {
        throw new AdminClientError({ message: "The Lace API could not be reached." });
      },
    }),
  );
  await screen.findByRole("heading", { name: "Edit posts" });
  await user.type(screen.getByLabelText("Title"), " again");
  await user.click(screen.getByRole("button", { name: "Save draft" }));
  expect(await within(screen.getByRole("banner")).findByText("Not saved")).toBeInTheDocument();
  expect(screen.getByLabelText("Title")).toHaveValue("First post again");
});

test("viewers see the entry read-only with no save or publish action", async () => {
  const user = userEvent.setup();
  const saveDraft = vi.fn(async () => draftEntry);
  const viewerModel: ContentModelDto = {
    blocks: [],
    fields: {
      enabled: { required: false, type: "boolean" },
      summary: { required: false, type: "text" },
    },
    key: "posts",
    kind: "collection",
    route: "/posts/:slug",
    version: 1,
  };
  renderRoute(
    "/content/posts/entry-1",
    createStaticSessionSource({ id: "viewer-1", role: "viewer" }),
    client({
      listModels: async () => ({ items: [models.items[0]!, viewerModel] }) as never,
      saveDraft,
    }),
  );
  await screen.findByRole("heading", { name: "Edit posts" });
  expect(within(screen.getByRole("banner")).getByRole("status")).toHaveTextContent("View only");
  expect(screen.queryByRole("button", { name: "Save draft" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Publish" })).not.toBeInTheDocument();
  expect(screen.getByLabelText("Title")).toBeDisabled();
  expect(screen.getByLabelText("Slug")).toBeDisabled();
  expect(screen.getByLabelText("Summary")).toBeDisabled();
  expect(screen.getByRole("switch", { name: "Enabled" })).toBeDisabled();
  await user.keyboard("{Control>}s{/Control}");
  expect(saveDraft).not.toHaveBeenCalled();
});

test("an admin can cancel the publish confirmation without publishing", async () => {
  const user = userEvent.setup();
  const publishEntry = vi.fn();
  renderRoute(
    "/content/posts/entry-1",
    createStaticSessionSource({ id: "admin-1", role: "admin" }),
    client({ publishEntry }),
  );
  await screen.findByRole("heading", { name: "Edit posts" });
  await user.click(within(screen.getByRole("banner")).getByRole("button", { name: "Publish" }));
  const dialog = screen.getByRole("dialog", { name: "Publish this entry?" });
  expect(dialog).toHaveTextContent("Draft revision 2 becomes the public version");
  await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(publishEntry).not.toHaveBeenCalled();
});

test("a writer clears a saved optional date and saves without it", async () => {
  const user = userEvent.setup();
  const saveDraft = vi.fn(async () => draftEntry);
  const dateModel: ContentModelDto = {
    blocks: [],
    fields: { eventDate: { required: false, type: "date" } },
    key: "posts",
    kind: "collection",
    route: "/posts/:slug",
    version: 1,
  };
  renderRoute(
    "/content/posts/entry-1",
    createStaticSessionSource({ id: "editor-1", role: "editor" }),
    client({
      listModels: async () => ({ items: [models.items[0]!, dateModel] }) as never,
      loadEntry: async () => ({
        ...draftEntry,
        draft: { ...draftEntry.draft, fields: { eventDate: "2026-09-01" } },
      }),
      saveDraft,
    }),
  );
  await screen.findByRole("heading", { name: "Edit posts" });
  expect(screen.getByRole("button", { name: "Event Date" })).toHaveTextContent("Sep 1, 2026");
  await user.click(screen.getByRole("button", { name: "Clear Event Date" }));
  expect(screen.getByRole("button", { name: "Event Date" })).toHaveTextContent("Pick a date");
  await user.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(1));
  expect(saveDraft).toHaveBeenCalledWith("entry-1", expect.objectContaining({ fields: {} }));
});
