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
  expect(adminQueryKeys.entries("posts", "opaque+/=")).toEqual([
    "admin",
    "entries",
    "posts",
    "opaque+/=",
  ]);
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
  };
  const fetcher = vi.fn(async () => Response.json(entry, { status: 201 }));
  const client = createAdminClient(fetcher);

  await expect(client.createEntry("posts", "First post")).resolves.toMatchObject({ id: "entry-1" });
  expect(fetcher).toHaveBeenCalledWith(
    "/api/v1/admin/models/posts/entries",
    expect.objectContaining({ credentials: "same-origin", method: "POST" }),
  );
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
