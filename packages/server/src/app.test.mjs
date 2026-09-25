import { expect, test } from "vitest";
import { createLaceApp } from "../dist/index.js";
import { ContentUseCases, MediaUseCases } from "@lacecms/application";
import { defineCollection, defineConfig, definePage } from "@lacecms/config";
import { defineBlock, field } from "@lacecms/content";
import { actorId, unixMilliseconds } from "@lacecms/domain";
import {
  DeterministicClock,
  DeterministicIdGenerator,
  InMemoryContentStore,
  InMemoryObjectStorage,
} from "@lacecms/test-utils";

const admin = { id: actorId("admin"), role: "admin" };
const editor = { id: actorId("editor"), role: "editor" };

async function fixture({ actor = admin, auth, ready = true, allowed = true } = {}) {
  const config = await defineConfig({
    blocks: [
      defineBlock({
        fields: { heading: field.text({ required: true }) },
        type: "hero",
        version: 1,
      }),
    ],
    content: [
      definePage({ key: "home", path: "/", version: 1 }),
      defineCollection({
        blocks: ["hero"],
        fields: { image: field.media() },
        key: "posts",
        route: "/blog/:slug",
        version: 1,
      }),
    ],
  });
  const store = new InMemoryContentStore();
  const storage = new InMemoryObjectStorage();
  const content = new ContentUseCases({
    clock: new DeterministicClock(unixMilliseconds(1)),
    config: config.public,
    content: store,
    idGenerator: new DeterministicIdGenerator("server"),
    media: store,
  });
  const logs = [];
  const media = new MediaUseCases({
    clock: new DeterministicClock(unixMilliseconds(1)),
    idGenerator: new DeterministicIdGenerator("media"),
    imageInspector: {
      async inspect() {
        return { height: 1, width: 1 };
      },
    },
    logger: { error() {} },
    media: store,
    publicMedia: store,
    storage,
  });
  let exportLoads = 0;
  const app = createLaceApp({
    ...(auth === undefined ? {} : { auth }),
    actors: { resolve: async () => actor },
    adminAssets: { fetch: async () => new Response("admin-shell") },
    config,
    content,
    environment: { engineVersion: "0.0.0-test", openApiTitle: "Lace test" },
    logger: { log: (entry) => logs.push(entry) },
    maxBodyBytes: 256,
    media,
    publicBaseUrl: "https://lace.test/",
    publicContent: {
      exportBuildContent: async () => {
        exportLoads += 1;
        return store.exportBuildContent();
      },
      listPublic: store.listPublic.bind(store),
      loadPublic: store.loadPublic.bind(store),
      loadPublicMedia: store.loadPublicMedia.bind(store),
      publishedContentVersion: store.publishedContentVersion.bind(store),
    },
    rateLimiter: { check: async () => allowed },
    readiness: { isReady: async () => ready },
    requestIds: { next: () => `request-${logs.length + 1}` },
  });
  return { app, content, exportLoads: () => exportLoads, logs, media, storage, store };
}

test("mounts authentication before API and admin fallbacks", async () => {
  const { app } = await fixture({
    auth: { fetch: async () => new Response("auth-route", { status: 202 }) },
  });
  expect(
    await (await app.fetch(new Request("https://lace.test/api/auth/sign-in/email"))).text(),
  ).toBe("auth-route");
  expect((await app.fetch(new Request("https://lace.test/api/auth/sign-in/email"))).status).toBe(
    202,
  );
  expect(await (await app.fetch(new Request("https://lace.test/health/live"))).json()).toEqual({
    status: "live",
  });
  expect(await json(app, "/api/unknown")).toMatchObject({ response: { status: 404 } });
});

async function json(app, path, init) {
  const response = await app.fetch(new Request(`https://lace.test${path}`, init));
  return {
    body: response.status === 204 || response.status === 304 ? undefined : await response.json(),
    response,
  };
}

test("keeps liveness, readiness, request IDs, and logs separate", async () => {
  const { app, logs } = await fixture({ ready: false });
  const live = await json(app, "/health/live");
  const ready = await json(app, "/health/ready");
  expect(live).toMatchObject({ body: { status: "live" }, response: { status: 200 } });
  expect(ready).toMatchObject({ body: { status: "not_ready" }, response: { status: 503 } });
  expect(live.response.headers.get("x-request-id")).toBe("request-1");
  expect(JSON.stringify(logs)).not.toContain("authorization");
});

test("serves public content and short-circuits matching build exports", async () => {
  const { app, content, exportLoads } = await fixture();
  const entry = await content.create({
    actor: admin,
    blocks: [],
    fields: {},
    modelKey: "posts",
    slug: "first",
    title: "First",
  });
  await content.publish({ actor: admin, entryId: entry.id, expectedRevision: 1 });
  expect(await json(app, "/api/v1/public/collections/posts?limit=1")).toMatchObject({
    body: { items: [{ path: "/blog/first" }] },
    response: { status: 200 },
  });
  const fresh = await json(app, "/api/v1/public/build-export");
  expect(fresh.response.headers.get("etag")).toBe('"1"');
  expect(exportLoads()).toBe(1);
  expect(
    (await json(app, "/api/v1/public/build-export", { headers: { "if-none-match": '"1"' } }))
      .response.status,
  ).toBe(304);
  expect(exportLoads()).toBe(1);
  expect(
    (await json(app, "/api/v1/public/build-export", { headers: { "if-none-match": '"0"' } }))
      .response.status,
  ).toBe(200);
  expect(exportLoads()).toBe(2);
  expect(
    await json(app, "/api/v1/public/build-export", { headers: { "if-none-match": "invalid" } }),
  ).toMatchObject({ body: { error: { code: "VALIDATION_FAILED" } }, response: { status: 422 } });
  const openApi = await json(app, "/api/v1/openapi.json");
  expect(openApi.body.paths).toHaveProperty("/api/v1/public/build-export");
});

test("validates admin requests, rejects anonymous actors, and protects fallbacks", async () => {
  const anonymous = await fixture({ actor: null });
  expect(await json(anonymous.app, "/api/v1/admin/content-models")).toMatchObject({
    body: { error: { code: "AUTHORIZATION_DENIED" } },
    response: { status: 403 },
  });
  const authenticated = await fixture({ actor: editor });
  expect(await json(authenticated.app, "/api/v1/admin/content-models")).toMatchObject({
    body: {
      items: [
        { blockDefinitions: [], blocks: [], key: "home" },
        {
          blockDefinitions: [{ fields: { heading: { type: "text" } }, type: "hero" }],
          key: "posts",
        },
      ],
    },
    response: { status: 200 },
  });
  expect(
    await json(authenticated.app, "/api/v1/admin/models/posts/entries", {
      body: JSON.stringify({ blocks: [], fields: {}, title: "Post", unknown: true }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  ).toMatchObject({ body: { error: { code: "VALIDATION_FAILED" } }, response: { status: 422 } });
  expect(
    await json(authenticated.app, "/api/v1/admin/models/posts/entries", {
      body: JSON.stringify({ blocks: [], fields: {}, slug: "post", title: "Post" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  ).toMatchObject({ body: { model: { key: "posts" } }, response: { status: 201 } });
  const publisher = await fixture();
  const created = await json(publisher.app, "/api/v1/admin/models/posts/entries", {
    body: JSON.stringify({ blocks: [], fields: {}, slug: "publish", title: "Publish" }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const entryId = created.body.id;
  expect(
    await json(publisher.app, `/api/v1/admin/entries/${entryId}/draft`, {
      body: JSON.stringify({
        blocks: [],
        expectedRevision: 1,
        fields: {},
        slug: "publish",
        title: "Changed",
      }),
      headers: { "content-type": "application/json", "if-match": '"2"' },
      method: "PUT",
    }),
  ).toMatchObject({ body: { error: { code: "VALIDATION_FAILED" } }, response: { status: 422 } });
  expect(
    await json(publisher.app, `/api/v1/admin/entries/${entryId}/publish`, {
      body: JSON.stringify({ expectedRevision: 1 }),
      headers: { "content-type": "application/json", "idempotency-key": "publish-key" },
      method: "POST",
    }),
  ).toMatchObject({
    body: {
      build: { status: "unavailable" },
      entry: { published: { state: "published" } },
      publication: "published",
    },
    response: { status: 200 },
  });
  expect(
    await (await authenticated.app.fetch(new Request("https://lace.test/admin/content"))).text(),
  ).toBe("admin-shell");
  expect(await json(authenticated.app, "/api/unknown")).toMatchObject({
    body: { error: { code: "NOT_FOUND" } },
    response: { status: 404 },
  });
});

test("renders stable body-limit and rate-limit envelopes", async () => {
  const { app } = await fixture();
  expect(
    await json(app, "/api/v1/admin/models/posts/entries", {
      body: JSON.stringify({ blocks: [], fields: {}, slug: "post", title: "x".repeat(1_000) }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  ).toMatchObject({ body: { error: { code: "PAYLOAD_TOO_LARGE" } }, response: { status: 413 } });
  const throttled = await fixture({ allowed: false });
  expect(await json(throttled.app, "/health/live")).toMatchObject({
    body: { error: { code: "RATE_LIMITED" } },
    response: { status: 429 },
  });
});

test("bodyless media lifecycle requests reach the use case without bypassing body limits elsewhere", async () => {
  const { app } = await fixture();
  const emptyBody = () =>
    new ReadableStream({
      start(controller) {
        controller.close();
      },
    });
  for (const [method, path] of [
    ["DELETE", "/api/v1/admin/media/missing"],
    ["POST", "/api/v1/admin/media/missing/retry-deletion"],
  ]) {
    const response = await app.fetch(
      new Request(`https://lace.test${path}`, {
        body: emptyBody(),
        duplex: "half",
        method,
      }),
    );
    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("CONTENT_INVALID_STATE");
  }
});

test("keeps media uploads, previews, and draft-only public reads separate", async () => {
  const { app, storage } = await fixture();
  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], {
      type: "text/plain",
    }),
    "cover\r\nX-Injected: nope.png",
  );
  const created = await app.fetch(
    new Request("https://lace.test/api/v1/admin/media", { body: form, method: "POST" }),
  );
  expect(created.status).toBe(201);
  const metadata = await created.json();
  expect(metadata).toMatchObject({
    mimeType: "image/png",
    url: expect.stringContaining("/media/"),
  });
  expect(metadata).not.toHaveProperty("storageKey");
  const preview = await app.fetch(
    new Request(`https://lace.test/api/v1/admin/media/${metadata.id}/preview`),
  );
  expect(preview.headers.get("content-type")).toBe("image/png");
  expect(preview.headers.get("content-disposition")).not.toMatch(/[\r\n]/u);
  expect(await json(app, `/api/v1/public/media/${metadata.id}`)).toMatchObject({
    body: { error: { code: "NOT_FOUND" } },
    response: { status: 404 },
  });
  const deleted = await app.fetch(
    new Request(`https://lace.test/api/v1/admin/media/${metadata.id}`, { method: "DELETE" }),
  );
  expect(deleted.status).toBe(202);

  const missing = await app.fetch(
    new Request("https://lace.test/api/v1/admin/media", { body: new FormData(), method: "POST" }),
  );
  expect(missing.status).toBe(422);
  const duplicate = new FormData();
  duplicate.append(
    "file",
    new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])]),
    "one.png",
  );
  duplicate.append(
    "file",
    new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])]),
    "two.png",
  );
  expect(
    (
      await app.fetch(
        new Request("https://lace.test/api/v1/admin/media", { body: duplicate, method: "POST" }),
      )
    ).status,
  ).toBe(422);
  const mismatch = new FormData();
  mismatch.append("file", new Blob([new TextEncoder().encode("not an image")]), "cover.png");
  expect(
    (
      await app.fetch(
        new Request("https://lace.test/api/v1/admin/media", { body: mismatch, method: "POST" }),
      )
    ).status,
  ).toBe(422);
  const oversized = new FormData();
  oversized.append("file", new Blob([new Uint8Array(10 * 1024 * 1024 + 1)]), "large.png");
  expect(
    (
      await app.fetch(
        new Request("https://lace.test/api/v1/admin/media", { body: oversized, method: "POST" }),
      )
    ).status,
  ).toBe(413);
  expect((await json(app, "/api/v1/admin/media")).body.items).toHaveLength(1);

  const publishable = new FormData();
  publishable.append(
    "file",
    new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])]),
    "published.png",
  );
  const publishedMedia = await (
    await app.fetch(
      new Request("https://lace.test/api/v1/admin/media", { body: publishable, method: "POST" }),
    )
  ).json();
  expect(publishedMedia).toMatchObject({ status: "active" });
  const entry = await json(app, "/api/v1/admin/models/posts/entries", {
    body: JSON.stringify({
      blocks: [],
      fields: { image: publishedMedia.id },
      slug: "image",
      title: "Image",
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  expect(entry.response.status).toBe(201);
  const publication = await json(app, `/api/v1/admin/entries/${entry.body.id}/publish`, {
    body: JSON.stringify({ expectedRevision: 1 }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  expect(publication.response.status).toBe(200);
  const publicMedia = await app.fetch(
    new Request(`https://lace.test/api/v1/public/media/${publishedMedia.id}`),
  );
  expect(publicMedia.status).toBe(200);
  expect(publicMedia.headers.get("content-type")).toBe("image/png");
  await storage.delete(`media/${publishedMedia.id}`);
  expect(await json(app, `/api/v1/public/media/${publishedMedia.id}`)).toMatchObject({
    body: { error: { code: "INTERNAL_ERROR" } },
    response: { status: 500 },
  });
});

test("allows viewers to list media but not mutate it", async () => {
  const { app } = await fixture({ actor: { id: actorId("viewer"), role: "viewer" } });
  expect((await json(app, "/api/v1/admin/media")).response.status).toBe(200);
  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])]),
    "denied.png",
  );
  expect(
    (
      await app.fetch(
        new Request("https://lace.test/api/v1/admin/media", { body: form, method: "POST" }),
      )
    ).status,
  ).toBe(403);
});

test("accepts an authorized retry only for terminal media deletion failures", async () => {
  const { app, storage, store } = await fixture();
  store.registerMedia({
    createdAt: unixMilliseconds(1),
    createdBy: actorId("admin"),
    filename: "failed.png",
    id: "failed-media",
    mimeType: "image/png",
    size: 1,
    status: "delete_failed",
    storageKey: "media/failed-media",
    updatedAt: unixMilliseconds(2),
  });
  expect(
    await (
      await app.fetch(
        new Request("https://lace.test/api/v1/admin/media/failed-media/retry-deletion", {
          method: "POST",
        }),
      )
    ).json(),
  ).toMatchObject({ status: "deleting" });
  expect(store.mediaDeletionRequests).toEqual(["failed-media"]);
  await expect(
    app.fetch(
      new Request("https://lace.test/api/v1/admin/media/failed-media/retry-deletion", {
        method: "POST",
      }),
    ),
  ).resolves.toMatchObject({ status: 422 });
  expect(await storage.get("media/failed-media")).toBeNull();
});
