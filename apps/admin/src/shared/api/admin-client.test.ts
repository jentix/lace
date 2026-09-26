import { expect, test, vi } from "vitest";
import {
  AdminClientError,
  adminQueryKeys,
  createAdminClient,
  isSessionExpiredError,
} from "./admin-client.js";

const model = {
  blocks: [],
  fields: {},
  key: "posts",
  kind: "collection",
  route: "/posts/:slug",
  version: 1,
};

test("validates credentialed shared-contract responses and keeps cursors opaque", async () => {
  const fetcher = vi.fn(async () => Response.json({ items: [model] }));
  const client = createAdminClient(fetcher);

  await expect(client.listModels()).resolves.toEqual({ items: [model] });
  expect(fetcher).toHaveBeenCalledWith("/api/v1/admin/content-models", {
    credentials: "same-origin",
    headers: { accept: "application/json" },
  });
  expect(adminQueryKeys.entryList("posts", { q: "launch", sort: "title" })).toEqual([
    "admin",
    "entries",
    "posts",
    "list",
    { q: "launch", sort: "title", status: null },
  ]);
  expect(adminQueryKeys.entryList("posts", { status: "draft" })).toEqual([
    "admin",
    "entries",
    "posts",
    "list",
    { q: null, sort: null, status: "draft" },
  ]);
  expect(adminQueryKeys.media("media+/=")).toEqual(["admin", "media", "media+/="]);
  expect(adminQueryKeys.entryOverview("posts")).toEqual(["admin", "entries", "posts", "overview"]);
  const prefix = adminQueryKeys.modelEntries("posts");
  for (const key of [adminQueryKeys.entryList("posts", {}), adminQueryKeys.entryOverview("posts")])
    expect(key.slice(0, prefix.length)).toEqual(prefix);
});

test("lists entries with an opaque cursor and optional server-side query", async () => {
  const page = {
    items: [
      {
        draftRevision: 1,
        id: "entry-1",
        listValues: { category: "news" },
        modelKey: "posts",
        slug: "first-post",
        status: "draft",
        title: "First post",
        updatedAt: "2026-09-20T00:00:00.000Z",
        updatedBy: { displayName: "editor@lace.test", id: "editor-1" },
      },
    ],
    totals: { all: 1, changed: 0, draft: 1, published: 0 },
  };
  const fetcher = vi.fn(async () => Response.json(page));
  const client = createAdminClient(fetcher);

  await expect(client.listEntries("posts")).resolves.toEqual(page);
  expect(fetcher).toHaveBeenLastCalledWith("/api/v1/admin/models/posts/entries", {
    credentials: "same-origin",
    headers: { accept: "application/json" },
  });
  await client.listEntries("posts", "opaque+/=", {
    q: "  launch ",
    sort: "-title",
    status: "draft",
  });
  expect(fetcher).toHaveBeenLastCalledWith(
    "/api/v1/admin/models/posts/entries?after=opaque%2B%2F%3D&q=launch&status=draft&sort=-title",
    expect.objectContaining({ credentials: "same-origin" }),
  );
  await client.listEntries("posts", undefined, { limit: 1 });
  expect(fetcher).toHaveBeenLastCalledWith(
    "/api/v1/admin/models/posts/entries?limit=1",
    expect.objectContaining({ credentials: "same-origin" }),
  );
  await expect(
    createAdminClient(async () => Response.json({ items: page.items })).listEntries("posts"),
  ).rejects.toBeInstanceOf(AdminClientError);
});

test("uses validated credentialed user, status, and token endpoints", async () => {
  const account = { disabled: false, email: "editor@lace.test", id: "user-1", role: "editor" };
  const token = {
    capabilities: ["content:build:read"],
    createdAt: "2026-09-20T00:00:00.000Z",
    id: "token-1",
    name: "Local site",
    tokenPrefix: "lace_123",
  };
  const fetcher = vi.fn(async (path: string, init?: RequestInit) => {
    if (path.endsWith("/settings/status"))
      return Response.json({ configuredModels: 2, ready: true });
    if (path.endsWith("/users") && init?.method === "POST")
      return Response.json(account, { status: 201 });
    if (path.endsWith("/users")) return Response.json({ items: [account] });
    if (path.endsWith("/user-1")) return Response.json({ ...account, role: "admin" });
    if (path.endsWith("/api-tokens") && init?.method === "POST")
      return Response.json({ ...token, token: "secret" }, { status: 201 });
    if (path.endsWith("/api-tokens")) return Response.json({ items: [token] });
    return Response.json({ ...token, revokedAt: "2026-09-21T00:00:00.000Z" });
  });
  const client = createAdminClient(fetcher as typeof fetch);
  await expect(client.listUsers()).resolves.toEqual({ items: [account] });
  await expect(
    client.createUser({ email: account.email, password: "long-password", role: "editor" }),
  ).resolves.toEqual(account);
  await expect(client.updateUser("user-1", { role: "admin" })).resolves.toMatchObject({
    role: "admin",
  });
  await expect(client.loadSettingsStatus()).resolves.toEqual({ configuredModels: 2, ready: true });
  await expect(client.listTokens()).resolves.toEqual({ items: [token] });
  await expect(client.createToken("Local site")).resolves.toMatchObject({ token: "secret" });
  await expect(client.revokeToken("token-1")).resolves.toMatchObject({
    revokedAt: "2026-09-21T00:00:00.000Z",
  });
  expect(fetcher.mock.calls.every(([, init]) => init?.credentials === "same-origin")).toBe(true);
  await expect(
    createAdminClient(async () => Response.json({ items: [{ token: "secret" }] })).listTokens(),
  ).rejects.toBeInstanceOf(AdminClientError);
});

test("lists validated media through the credentialed admin API", async () => {
  const item = {
    createdAt: "2026-09-20T00:00:00.000Z",
    createdBy: "admin-1",
    filename: "hero.png",
    id: "media-1",
    mimeType: "image/png",
    size: 12,
    status: "active",
    updatedAt: "2026-09-20T00:00:00.000Z",
    url: "https://lace.test/api/v1/public/media/media-1",
  };
  const fetcher = vi.fn(async () => Response.json({ items: [item], nextCursor: "next" }));
  await expect(createAdminClient(fetcher).listMedia("previous+/=")).resolves.toEqual({
    items: [item],
    nextCursor: "next",
  });
  expect(fetcher).toHaveBeenCalledWith("/api/v1/admin/media?after=previous%2B%2F%3D", {
    credentials: "same-origin",
    headers: { accept: "application/json" },
  });
  await expect(
    createAdminClient(async () => Response.json({ items: [{ id: "bad" }] })).listMedia(),
  ).rejects.toBeInstanceOf(AdminClientError);
});

test("uploads and requests media deletion with validated credentialed responses", async () => {
  const item = {
    createdAt: "2026-09-20T00:00:00.000Z",
    createdBy: "admin-1",
    filename: "hero.png",
    id: "media-1",
    mimeType: "image/png",
    size: 12,
    status: "active",
    updatedAt: "2026-09-20T00:00:00.000Z",
    url: "https://lace.test/api/v1/public/media/media-1",
  };
  const fetcher = vi.fn(async () => Response.json(item, { status: 201 }));
  const client = createAdminClient(fetcher);
  const file = new File(["image"], "hero.png", { type: "image/png" });
  await expect(client.uploadMedia(file)).resolves.toEqual(item);
  expect(fetcher).toHaveBeenLastCalledWith(
    "/api/v1/admin/media",
    expect.objectContaining({
      body: expect.any(FormData),
      credentials: "same-origin",
      method: "POST",
    }),
  );
  const uploadRequest = fetcher.mock.calls[0] as unknown as [string, RequestInit];
  expect(uploadRequest[1].body).toBeInstanceOf(FormData);
  expect((uploadRequest[1].body as FormData).get("file")).toEqual(file);
  await expect(client.deleteMedia("media/1")).resolves.toEqual(item);
  expect(fetcher).toHaveBeenLastCalledWith(
    "/api/v1/admin/media/media%2F1",
    expect.objectContaining({ credentials: "same-origin", method: "DELETE" }),
  );
  await expect(client.retryMediaDeletion("media-1")).resolves.toEqual(item);
  expect(fetcher).toHaveBeenLastCalledWith(
    "/api/v1/admin/media/media-1/retry-deletion",
    expect.objectContaining({ credentials: "same-origin", method: "POST" }),
  );
  await expect(
    createAdminClient(async () => Response.json({ id: "invalid" })).uploadMedia(file),
  ).rejects.toBeInstanceOf(AdminClientError);
});

test("media mutations preserve API failures and map transport failure safely", async () => {
  const denied = createAdminClient(async () =>
    Response.json({ error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 }),
  );
  await expect(denied.deleteMedia("media-1")).rejects.toMatchObject({ status: 403 });
  const rejected = createAdminClient(async () =>
    Response.json(
      { error: { code: "VALIDATION_FAILED", message: "Invalid image" } },
      { status: 422 },
    ),
  );
  await expect(rejected.uploadMedia(new File(["bad"], "bad.png"))).rejects.toMatchObject({
    code: "VALIDATION_FAILED",
  });
  await expect(
    createAdminClient(async () => {
      throw new Error("sensitive transport detail");
    }).retryMediaDeletion("media-1"),
  ).rejects.toMatchObject({ message: "The Lace API could not be reached." });
});

test("rejects malformed responses and maps API errors with their request ID", async () => {
  await expect(
    createAdminClient(async () => Response.json({ unexpected: true })).listModels(),
  ).rejects.toBeInstanceOf(AdminClientError);

  const response = Response.json(
    { error: { code: "NOT_FOUND", message: "Missing model" } },
    { headers: { "x-request-id": "request-42" }, status: 404 },
  );
  await expect(createAdminClient(async () => response).listModels()).rejects.toMatchObject({
    code: "NOT_FOUND",
    requestId: "request-42",
    status: 404,
  });
});

test("sends collection mutations with credentialed JSON requests", async () => {
  const entry = {
    draft: {
      blocks: [],
      createdAt: "2026-09-20T00:00:00.000Z",
      entryId: "entry-1",
      fields: {},
      id: "snapshot-1",
      revision: 0,
      state: "draft",
      title: "First post",
      updatedAt: "2026-09-20T00:00:00.000Z",
      updatedBy: { id: "editor-1", role: "editor" },
    },
    id: "entry-1",
    model: { key: "posts", kind: "collection", route: "/posts/:slug" },
    updatedBy: { displayName: "editor@lace.test", id: "editor-1" },
  };
  const fetcher = vi.fn(async () => Response.json(entry, { status: 201 }));
  const client = createAdminClient(fetcher);

  await expect(client.createEntry("posts", "First post")).resolves.toMatchObject({ id: "entry-1" });
  expect(fetcher).toHaveBeenCalledWith(
    "/api/v1/admin/models/posts/entries",
    expect.objectContaining({ credentials: "same-origin", method: "POST" }),
  );
});

test("loads and saves one validated complete draft with its revision", async () => {
  const entry = {
    draft: {
      blocks: [],
      createdAt: "2026-09-20T00:00:00.000Z",
      entryId: "entry-1",
      fields: { body: "Original" },
      id: "snapshot-1",
      revision: 3,
      state: "draft",
      title: "First post",
      updatedAt: "2026-09-20T00:00:00.000Z",
      updatedBy: { id: "editor-1", role: "editor" },
    },
    id: "entry-1",
    model: { key: "posts", kind: "collection", route: "/posts/:slug" },
    updatedBy: { displayName: "editor@lace.test", id: "editor-1" },
  };
  const fetcher = vi.fn(async () => Response.json(entry));
  const client = createAdminClient(fetcher);

  await expect(client.loadEntry("entry-1")).resolves.toMatchObject({ id: "entry-1" });
  await expect(
    client.saveDraft("entry-1", {
      blocks: [],
      expectedRevision: 3,
      fields: { body: "Updated" },
      slug: "first-post",
      title: "First post",
    }),
  ).resolves.toMatchObject({ draft: { revision: 3 } });
  expect(fetcher).toHaveBeenLastCalledWith(
    "/api/v1/admin/entries/entry-1/draft",
    expect.objectContaining({ credentials: "same-origin", method: "PUT" }),
  );
});

test("publishes with one validated idempotency key and rejects malformed publish results", async () => {
  const entry = {
    draft: {
      blocks: [],
      createdAt: "2026-09-20T00:00:00.000Z",
      entryId: "entry-1",
      fields: {},
      id: "snapshot-1",
      revision: 3,
      state: "draft",
      title: "First post",
      updatedAt: "2026-09-20T00:00:00.000Z",
      updatedBy: { id: "admin-1", role: "admin" },
    },
    id: "entry-1",
    model: { key: "posts", kind: "collection", route: "/posts/:slug" },
    updatedBy: { displayName: "editor@lace.test", id: "editor-1" },
  };
  const fetcher = vi.fn(async () =>
    Response.json({ build: { status: "unavailable" }, entry, publication: "published" }),
  );
  await expect(
    createAdminClient(fetcher).publishEntry("entry-1", {
      expectedRevision: 3,
      idempotencyKey: "publish-attempt-1",
    }),
  ).resolves.toMatchObject({ build: { status: "unavailable" }, publication: "published" });
  expect(fetcher).toHaveBeenCalledWith(
    "/api/v1/admin/entries/entry-1/publish",
    expect.objectContaining({
      credentials: "same-origin",
      headers: expect.objectContaining({ "idempotency-key": "publish-attempt-1" }),
      method: "POST",
    }),
  );
  await expect(
    createAdminClient(async () => Response.json({ entry })).publishEntry("entry-1", {
      expectedRevision: 3,
      idempotencyKey: "publish-attempt-1",
    }),
  ).rejects.toBeInstanceOf(AdminClientError);
});

test("retains only validated field issues from an API error", async () => {
  await expect(
    createAdminClient(async () =>
      Response.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            details: {
              issues: [{ code: "invalid_value", message: "Invalid", path: "/fields/body" }],
            },
            message: "Invalid request",
          },
        },
        { status: 422 },
      ),
    ).saveDraft("entry-1", { blocks: [], expectedRevision: 1, fields: {}, title: "Post" }),
  ).rejects.toMatchObject({ issues: [{ path: "/fields/body" }] });
});

test("identifies only authentication-status client errors as recovery candidates", () => {
  expect(isSessionExpiredError(new AdminClientError({ message: "Expired", status: 401 }))).toBe(
    true,
  );
  expect(isSessionExpiredError(new AdminClientError({ message: "Denied", status: 403 }))).toBe(
    true,
  );
  expect(isSessionExpiredError(new AdminClientError({ message: "Conflict", status: 409 }))).toBe(
    false,
  );
});
