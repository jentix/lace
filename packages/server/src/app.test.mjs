import { expect, test } from "vitest";
import { createLaceApp } from "../dist/index.js";
import { ContentUseCases } from "@lacecms/application";
import { defineCollection, defineConfig, definePage } from "@lacecms/config";
import { actorId, unixMilliseconds } from "@lacecms/domain";
import {
  DeterministicClock,
  DeterministicIdGenerator,
  InMemoryContentStore,
} from "@lacecms/test-utils";

const admin = { id: actorId("admin"), role: "admin" };
const editor = { id: actorId("editor"), role: "editor" };

async function fixture({ actor = admin, ready = true, allowed = true } = {}) {
  const config = await defineConfig({
    content: [
      definePage({ key: "home", path: "/", version: 1 }),
      defineCollection({ key: "posts", route: "/blog/:slug", version: 1 }),
    ],
  });
  const store = new InMemoryContentStore();
  const content = new ContentUseCases({
    clock: new DeterministicClock(unixMilliseconds(1)),
    config: config.runtime,
    content: store,
    idGenerator: new DeterministicIdGenerator("server"),
    media: store,
  });
  const logs = [];
  let exportLoads = 0;
  const app = createLaceApp({
    actors: { resolve: async () => actor },
    adminAssets: { fetch: async () => new Response("admin-shell") },
    config,
    content,
    environment: { engineVersion: "0.0.0-test", openApiTitle: "Lace test" },
    logger: { log: (entry) => logs.push(entry) },
    maxBodyBytes: 256,
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
  return { app, content, exportLoads: () => exportLoads, logs };
}

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
  ).toMatchObject({ body: { published: { state: "published" } }, response: { status: 200 } });
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
