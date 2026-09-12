import { expect, test } from "vitest";
import {
  DeterministicClock,
  DeterministicIdGenerator,
  DeterministicTokenHasher,
  InMemoryCache,
  InMemoryContentStore,
  InMemoryDispatcherLeasePort,
  InMemoryObjectStorage,
  InMemorySiteBuildTrigger,
  packageName,
} from "../dist/index.js";
import {
  actorId,
  blockKey,
  contentEntryId,
  contentModelKey,
  contentSnapshotId,
  createContentEntry,
  unixMilliseconds,
} from "@lacecms/domain";
import { dispatcherEventId, opaqueTokenSecret } from "@lacecms/application";
test("exports its package identity", () => expect(packageName).toBe("@lacecms/test-utils"));

const admin = { id: actorId("admin"), role: "admin" };
const editor = { id: actorId("editor"), role: "editor" };

function stream(text) {
  const bytes = new TextEncoder().encode(text);
  return {
    async *[Symbol.asyncIterator]() {
      yield bytes;
    },
  };
}

async function read(streamValue) {
  const chunks = [];
  for await (const chunk of streamValue) chunks.push(...chunk);
  return new TextDecoder().decode(new Uint8Array(chunks));
}

function entry({ id, model, slug, title = "Original" }) {
  return createContentEntry({
    id: contentEntryId(id),
    model,
    draft: {
      blocks: [
        {
          data: { body: title },
          key: blockKey(`${id}-block`),
          position: 1000,
          schemaVersion: 1,
          type: "richText",
        },
      ],
      createdAt: unixMilliseconds(1),
      entryId: contentEntryId(id),
      fields: { body: title },
      id: contentSnapshotId(`${id}-draft`),
      revision: 1,
      ...(slug === undefined ? {} : { slug }),
      state: "draft",
      title,
      updatedAt: unixMilliseconds(1),
      updatedBy: editor,
    },
  });
}

function savedMutation(revision, title, slug) {
  return {
    blocks: [
      {
        data: { body: title },
        key: blockKey(`${title}-block`),
        position: 1000,
        schemaVersion: 1,
        type: "richText",
      },
    ],
    expectedRevision: revision,
    fields: { body: title },
    slug,
    title,
    updatedAt: unixMilliseconds(revision + 1),
    updatedBy: editor,
  };
}

test("provides deterministic infrastructure fakes with detached values", async () => {
  const clock = new DeterministicClock(unixMilliseconds(10));
  expect(clock.advanceBy(5)).toBe(15);
  const ids = new DeterministicIdGenerator("test");
  expect([ids.next(), ids.next()]).toEqual(["test-1", "test-2"]);

  const storage = new InMemoryObjectStorage();
  await storage.put({ body: stream("hello"), contentType: "text/plain", key: "media/a" });
  expect(await read(await storage.get("media/a"))).toBe("hello");
  expect(await storage.createReadUrl("media/a")).toBe("memory-object://media%2Fa");
  await storage.delete("media/a");
  expect(await storage.get("media/a")).toBeNull();

  const cache = new InMemoryCache();
  expect(await cache.get("missing")).toBeNull();
  await cache.set("data", { nested: { value: 1 } });
  const cached = await cache.get("data");
  cached.nested.value = 2;
  expect((await cache.get("data")).nested.value).toBe(1);

  const tokens = new DeterministicTokenHasher();
  const verifier = await tokens.hash(opaqueTokenSecret("build-secret"));
  expect(verifier).not.toContain("build-secret");
  await expect(tokens.verify(opaqueTokenSecret("build-secret"), verifier)).resolves.toBe(true);
  await expect(tokens.verify(opaqueTokenSecret("wrong"), verifier)).resolves.toBe(false);

  const trigger = new InMemorySiteBuildTrigger({ accepted: false });
  expect(
    await trigger.trigger({ requestedAt: clock.now(), requestedBy: admin, targetVersion: 2 }),
  ).toEqual({ accepted: false });
  expect(trigger.requests).toHaveLength(1);
});

test("leases one dispatcher event exclusively until it is completed", async () => {
  const leases = new InMemoryDispatcherLeasePort();
  leases.enqueue({
    attempts: 0,
    availableAt: unixMilliseconds(10),
    id: dispatcherEventId("event-1"),
    payload: { target: "site" },
    type: "build",
  });
  const first = await leases.claim({ leaseDurationMs: 20, limit: 1, now: unixMilliseconds(10) });
  expect(first).toHaveLength(1);
  await expect(
    leases.claim({ leaseDurationMs: 20, limit: 1, now: unixMilliseconds(11) }),
  ).resolves.toEqual([]);
  await leases.complete({
    completedAt: unixMilliseconds(15),
    leaseId: first[0].id,
    outcome: "succeeded",
  });
  await expect(
    leases.claim({ leaseDurationMs: 20, limit: 1, now: unixMilliseconds(16) }),
  ).resolves.toEqual([]);
});

test("syncs models and lists entry summaries through opaque cursors", async () => {
  const store = new InMemoryContentStore();
  const firstModel = {
    key: "posts",
    kind: "collection",
    projectionHash: "projection-a",
    structureHash: "structure-a",
    version: 1,
  };
  expect(await store.inspect({ models: [firstModel] })).toEqual({
    added: ["posts"],
    changed: [],
    removed: [],
  });
  await store.apply({ models: [firstModel] });
  expect(
    (await store.apply({ models: [{ ...firstModel, structureHash: "structure-b", version: 2 }] }))
      .inspection.changed,
  ).toEqual(["posts"]);

  const model = { key: contentModelKey("posts"), kind: "collection", route: "/blog/:slug" };
  await store.create({ entry: entry({ id: "entry-a", model }) });
  await store.create({ entry: entry({ id: "entry-b", model }) });
  const firstPage = await store.list({ limit: 1, modelKey: model.key });
  expect(firstPage.items.map((item) => item.id)).toEqual(["entry-a"]);
  expect(firstPage.nextCursor).toBeDefined();
  await expect(
    store.list({ after: firstPage.nextCursor, limit: 1, modelKey: model.key }),
  ).resolves.toMatchObject({ items: [{ id: "entry-b" }] });
});

test("enforces singleton, revision, route, and immutable-publication boundaries atomically", async () => {
  const store = new InMemoryContentStore();
  const posts = { key: contentModelKey("posts"), kind: "collection", route: "/blog/:slug" };
  const page = { key: contentModelKey("home"), kind: "page", path: "/" };
  await store.create({ entry: entry({ id: "page-a", model: page }) });
  await expect(store.create({ entry: entry({ id: "page-b", model: page }) })).rejects.toMatchObject(
    { code: "CONTENT_MODEL_CARDINALITY_CONFLICT" },
  );

  await store.create({ entry: entry({ id: "post-a", model: posts }) });
  await store.saveCompleteDraft({
    entryId: contentEntryId("post-a"),
    mutation: savedMutation(1, "Published", "first"),
  });
  await store.publish({
    entryId: contentEntryId("post-a"),
    expectedRevision: 2,
    publishedAt: unixMilliseconds(4),
    publishedBy: admin,
    publishedSnapshotId: contentSnapshotId("post-a-published"),
  });
  await expect(
    store.saveCompleteDraft({
      entryId: contentEntryId("post-a"),
      mutation: savedMutation(1, "Stale", "first"),
    }),
  ).rejects.toMatchObject({ code: "CONTENT_REVISION_CONFLICT" });
  await store.saveCompleteDraft({
    entryId: contentEntryId("post-a"),
    mutation: savedMutation(2, "Draft edit", "first"),
  });
  expect((await store.exportBuildContent()).entries[0].entry.published.title).toBe("Published");

  await store.create({ entry: entry({ id: "post-b", model: posts }) });
  await store.saveCompleteDraft({
    entryId: contentEntryId("post-b"),
    mutation: savedMutation(1, "Collision", "first"),
  });
  await expect(
    store.publish({
      entryId: contentEntryId("post-b"),
      expectedRevision: 2,
      publishedAt: unixMilliseconds(4),
      publishedBy: admin,
      publishedSnapshotId: contentSnapshotId("post-b-published"),
    }),
  ).rejects.toMatchObject({ code: "CONTENT_ROUTE_CONFLICT" });
  expect(await store.loadPublished({ entryId: contentEntryId("post-b") })).toBeNull();
  expect((await store.exportBuildContent()).entries).toHaveLength(1);
});
