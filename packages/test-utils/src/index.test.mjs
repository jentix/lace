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
import {
  dispatcherEventId,
  opaqueTokenSecret,
  publicationIdempotencyKey,
  publicationRequestFingerprint,
} from "@lacecms/application";
import { ContentUseCases } from "@lacecms/application";
import { defineCollection, defineConfig, definePage } from "@lacecms/config";
import { defineBlock, field } from "@lacecms/content";
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

test("replays matching idempotent publications without changing public content", async () => {
  const store = new InMemoryContentStore();
  const model = { key: contentModelKey("posts"), kind: "collection", route: "/blog/:slug" };
  await store.create({ entry: entry({ id: "post-idempotent", model, slug: "first" }) });
  const input = {
    entryId: contentEntryId("post-idempotent"),
    expectedRevision: 1,
    idempotency: {
      actorId: admin.id,
      fingerprint: publicationRequestFingerprint("sha256:first"),
      key: publicationIdempotencyKey("request-1"),
    },
    publishedAt: unixMilliseconds(2),
    publishedBy: admin,
    publishedSnapshotId: contentSnapshotId("post-idempotent-published"),
  };
  const first = await store.publish(input);
  const version = (await store.exportBuildContent()).version;
  const replay = await store.publish(input);

  expect(first.outcome).toBe("published");
  expect(replay).toMatchObject({ outcome: "replayed", status: "published" });
  expect(replay.entry).not.toBe(first.entry);
  expect((await store.exportBuildContent()).version).toBe(version);
  await expect(
    store.publish({
      ...input,
      idempotency: {
        ...input.idempotency,
        fingerprint: publicationRequestFingerprint("sha256:other"),
      },
    }),
  ).rejects.toMatchObject({ code: "CONTENT_INVALID_STATE" });
  expect((await store.exportBuildContent()).version).toBe(version);
});

test("runs the authorized in-memory content lifecycle with validation and isolated publications", async () => {
  const config = await defineConfig({
    blocks: [
      defineBlock({
        fields: { image: field.media({ required: true }) },
        type: "asset",
        version: 1,
      }),
    ],
    content: [
      definePage({
        blocks: ["asset"],
        fields: { label: field.text({ defaultValue: "Home" }) },
        key: "home",
        path: "/",
        version: 1,
      }),
      defineCollection({
        blocks: ["asset"],
        key: "posts",
        route: "/blog/:slug",
        version: 1,
      }),
    ],
  });
  const store = new InMemoryContentStore();
  const trigger = new InMemorySiteBuildTrigger({ accepted: true });
  const useCases = new ContentUseCases({
    clock: new DeterministicClock(unixMilliseconds(10)),
    config: config.runtime,
    content: store,
    idGenerator: new DeterministicIdGenerator("content"),
    media: {
      async loadMedia(id) {
        return id === "media-1"
          ? {
              createdAt: unixMilliseconds(1),
              createdBy: admin.id,
              filename: "cover.png",
              id,
              mimeType: "image/png",
              size: 1,
              status: "active",
              storageKey: "media/cover.png",
              updatedAt: unixMilliseconds(1),
            }
          : id === "inactive"
            ? {
                createdAt: unixMilliseconds(1),
                createdBy: admin.id,
                filename: "inactive.png",
                id,
                mimeType: "image/png",
                size: 1,
                status: "deleting",
                storageKey: "media/inactive.png",
                updatedAt: unixMilliseconds(1),
              }
            : null;
      },
    },
    siteBuildTrigger: trigger,
  });
  const draft = {
    blocks: [
      {
        data: { image: "media-1" },
        key: blockKey("hero"),
        position: 1000,
        schemaVersion: 1,
        type: "asset",
      },
    ],
    fields: {},
    title: "Home",
  };

  const created = await useCases.create({ actor: editor, modelKey: "home", ...draft });
  expect(created.draft.fields).toEqual({ label: "Home" });
  const viewer = { id: actorId("viewer"), role: "viewer" };
  expect((await useCases.list({ actor: viewer, limit: 1, modelKey: "home" })).items).toHaveLength(
    1,
  );
  await expect(useCases.load({ actor: viewer, entryId: created.id })).resolves.toMatchObject({
    id: created.id,
  });
  await expect(
    useCases.create({ actor: viewer, modelKey: "posts", ...draft, slug: "denied" }),
  ).rejects.toMatchObject({
    code: "AUTHORIZATION_DENIED",
  });
  await expect(
    useCases.publish({ actor: editor, entryId: created.id, expectedRevision: 1 }),
  ).rejects.toMatchObject({
    code: "AUTHORIZATION_DENIED",
  });
  await expect(
    useCases.save({
      actor: editor,
      entryId: created.id,
      expectedRevision: 1,
      ...draft,
      blocks: [{ ...draft.blocks[0], data: { image: "missing" } }],
    }),
  ).rejects.toMatchObject({ code: "CONTENT_INVALID_STATE" });
  await expect(
    useCases.save({
      actor: editor,
      entryId: created.id,
      expectedRevision: 1,
      ...draft,
      fields: { unknown: true },
    }),
  ).rejects.toMatchObject({ name: "ContentValidationError" });
  await expect(
    useCases.save({
      actor: editor,
      entryId: created.id,
      expectedRevision: 1,
      ...draft,
      blocks: [...draft.blocks, { ...draft.blocks[0], key: blockKey("second"), position: 1000 }],
    }),
  ).rejects.toMatchObject({ code: "CONTENT_INVALID_STATE" });
  await expect(
    useCases.save({
      actor: editor,
      entryId: created.id,
      expectedRevision: 1,
      ...draft,
      title: "x".repeat(201),
    }),
  ).rejects.toMatchObject({ name: "ContentValidationError" });
  await expect(
    useCases.save({
      actor: editor,
      entryId: created.id,
      expectedRevision: 1,
      ...draft,
      blocks: [{ ...draft.blocks[0], data: { image: "inactive" } }],
    }),
  ).rejects.toMatchObject({ code: "CONTENT_INVALID_STATE" });
  expect((await useCases.loadDraft({ actor: admin, entryId: created.id })).revision).toBe(1);

  const incomplete = await useCases.create({
    actor: editor,
    modelKey: "posts",
    ...draft,
    blocks: [{ ...draft.blocks[0], data: {} }],
    slug: "incomplete",
  });
  await expect(
    useCases.publish({ actor: admin, entryId: incomplete.id, expectedRevision: 1 }),
  ).rejects.toMatchObject({ name: "ContentValidationError" });

  const publication = await useCases.publish({
    actor: admin,
    entryId: created.id,
    expectedRevision: 1,
    idempotencyKey: "publish-home",
  });
  const replay = await useCases.publish({
    actor: admin,
    entryId: created.id,
    expectedRevision: 1,
    idempotencyKey: "publish-home",
  });
  expect(publication).toMatchObject({ build: { status: "accepted" }, publication: "published" });
  expect(replay).toMatchObject({ build: { status: "not-dispatched" }, publication: "replayed" });
  expect(trigger.requests).toHaveLength(1);

  await useCases.save({
    actor: editor,
    entryId: created.id,
    expectedRevision: 1,
    ...draft,
    title: "Edited draft",
  });
  expect((await useCases.loadPublished({ actor: admin, entryId: created.id })).title).toBe("Home");
  await expect(useCases.delete({ actor: editor, entryId: created.id })).rejects.toMatchObject({
    code: "AUTHORIZATION_DENIED",
  });

  const firstPost = await useCases.create({
    actor: editor,
    modelKey: "posts",
    ...draft,
    slug: "first",
  });
  await expect(
    useCases.publish({ actor: admin, entryId: firstPost.id, expectedRevision: 1 }),
  ).resolves.toMatchObject({ publication: "published" });
  const conflictingPost = await useCases.create({
    actor: editor,
    modelKey: "posts",
    ...draft,
    slug: "first",
  });
  await expect(
    useCases.publish({ actor: admin, entryId: conflictingPost.id, expectedRevision: 1 }),
  ).rejects.toMatchObject({ code: "CONTENT_ROUTE_CONFLICT" });
  expect(await useCases.loadPublished({ actor: admin, entryId: conflictingPost.id })).toBeNull();
});

test("reports rejected and unavailable builds without undoing a publication", async () => {
  const config = await defineConfig({
    blocks: [
      defineBlock({
        fields: { image: field.media({ required: true }) },
        type: "asset",
        version: 1,
      }),
    ],
    content: [
      defineCollection({ blocks: ["asset"], key: "posts", route: "/blog/:slug", version: 1 }),
    ],
  });
  const store = new InMemoryContentStore();
  const dependencies = {
    clock: new DeterministicClock(unixMilliseconds(10)),
    config: config.runtime,
    content: store,
    idGenerator: new DeterministicIdGenerator("build"),
    media: {
      async loadMedia() {
        return {
          createdAt: unixMilliseconds(1),
          createdBy: admin.id,
          filename: "cover.png",
          id: "media-1",
          mimeType: "image/png",
          size: 1,
          status: "active",
          storageKey: "media/cover.png",
          updatedAt: unixMilliseconds(1),
        };
      },
    },
  };
  const draft = {
    blocks: [
      {
        data: { image: "media-1" },
        key: blockKey("hero"),
        position: 1000,
        schemaVersion: 1,
        type: "asset",
      },
    ],
    fields: {},
    slug: "first",
    title: "First",
  };
  const rejected = new ContentUseCases({
    ...dependencies,
    siteBuildTrigger: new InMemorySiteBuildTrigger({ accepted: false }),
  });
  const entry = await rejected.create({ actor: editor, modelKey: "posts", ...draft });
  await expect(
    rejected.publish({ actor: admin, entryId: entry.id, expectedRevision: 1 }),
  ).resolves.toMatchObject({ build: { status: "rejected" }, publication: "published" });
  expect((await rejected.loadPublished({ actor: admin, entryId: entry.id })).title).toBe("First");

  await rejected.save({
    actor: editor,
    entryId: entry.id,
    expectedRevision: 1,
    ...draft,
    title: "Second",
  });
  const unavailable = new ContentUseCases({
    ...dependencies,
    siteBuildTrigger: {
      async trigger() {
        throw new Error("offline");
      },
    },
  });
  await expect(
    unavailable.publish({ actor: admin, entryId: entry.id, expectedRevision: 2 }),
  ).resolves.toMatchObject({ build: { status: "unavailable" }, publication: "published" });
  expect((await unavailable.loadPublished({ actor: admin, entryId: entry.id })).title).toBe(
    "Second",
  );
});
