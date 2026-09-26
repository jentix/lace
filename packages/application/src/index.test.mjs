import { expect, test } from "vitest";
import {
  actorDisplayName,
  foldAscii,
  dispatcherEventId,
  dispatcherLeaseId,
  checkConfigurationSynchronization,
  contentSyncActor,
  createConfigurationSyncPageEntry,
  applyPreparedConfigurationSynchronization,
  opaqueCursor,
  opaqueTokenSecret,
  opaqueTokenVerifier,
  packageName,
  planConfigurationSynchronization,
  publicationIdempotencyKey,
  publicationRequestFingerprint,
  renderConfigurationSyncPlanJson,
  renderConfigurationSyncPlanText,
  reportConfigurationSynchronization,
  prepareConfigurationSynchronization,
  MediaUseCases,
} from "../dist/index.js";
import { DomainError } from "@lacecms/domain";
import { defineCollection, defineConfig, definePage } from "@lacecms/config";
import { field } from "@lacecms/content";
test("exports its package identity", () => expect(packageName).toBe("@lacecms/application"));

test("brands portable opaque values without exposing runtime dependencies", () => {
  expect(opaqueCursor("next-page")).toBe("next-page");
  expect(opaqueTokenSecret("secret")).toBe("secret");
  expect(opaqueTokenVerifier("verifier")).toBe("verifier");
  expect(dispatcherEventId("event-1")).toBe("event-1");
  expect(dispatcherLeaseId("lease-1")).toBe("lease-1");
  expect(publicationIdempotencyKey("publish-1")).toBe("publish-1");
  expect(publicationRequestFingerprint("sha256:abc")).toBe("sha256:abc");
  expect(() => opaqueCursor("")).toThrow(TypeError);
});

function model(overrides = {}) {
  return {
    key: "posts",
    kind: "collection",
    projectionHash: "projection-a",
    structureHash: "structure-a",
    version: 1,
    ...overrides,
  };
}

function stored(overrides = {}) {
  return {
    draftSnapshotCount: 0,
    entryCount: 0,
    key: "posts",
    kind: "collection",
    projectionHash: "projection-a",
    publishedSnapshotCount: 0,
    structureHash: "structure-a",
    version: 1,
    ...overrides,
  };
}

test("plans creates, no-ops, display changes, and compatible version updates", () => {
  const created = planConfigurationSynchronization({ models: [model()], storedModels: [] });
  expect(created).toMatchObject({
    diagnostics: [],
    isValid: true,
    operations: [{ action: "create", model: { key: "posts" } }],
    requiresApply: true,
  });

  const unchanged = planConfigurationSynchronization({
    models: [model()],
    storedModels: [stored()],
  });
  expect(unchanged).toMatchObject({ diagnostics: [], isValid: true, operations: [] });
  expect(checkConfigurationSynchronization(unchanged).exitCode).toBe(0);

  const display = planConfigurationSynchronization({
    models: [model({ projectionHash: "projection-b" })],
    storedModels: [stored()],
  });
  expect(display.operations).toMatchObject([{ action: "label-update", model: { key: "posts" } }]);

  const version = planConfigurationSynchronization({
    models: [model({ structureHash: "structure-b", version: 2 })],
    storedModels: [stored()],
  });
  expect(version.operations).toMatchObject([{ action: "version-update", model: { version: 2 } }]);
});

test("rejects kind changes, version regressions, and unversioned structure changes", () => {
  for (const candidate of [
    model({ kind: "page" }),
    model({ version: 0 }),
    model({ structureHash: "structure-b" }),
  ]) {
    const plan = planConfigurationSynchronization({
      models: [candidate],
      storedModels: [stored()],
    });
    expect(plan.isValid).toBe(false);
    expect(plan.requiresApply).toBe(false);
    expect(plan.operations).toMatchObject([
      { action: "incompatible-change", model: { key: "posts" } },
    ]);
  }
});

test("requires explicit safe renames and protects stored entries and snapshots", () => {
  const renamed = planConfigurationSynchronization({
    models: [model({ key: "articles", renamedFrom: "posts" })],
    storedModels: [stored({ entryCount: 1 })],
  });
  expect(renamed).toMatchObject({
    diagnostics: [],
    isValid: true,
    operations: [{ action: "rename", model: { key: "articles" }, renamedFrom: "posts" }],
  });

  const replacement = planConfigurationSynchronization({
    models: [model({ key: "articles" })],
    storedModels: [stored({ entryCount: 1 })],
  });
  expect(replacement).toMatchObject({
    isValid: false,
    operations: [
      { action: "create", model: { key: "articles" } },
      { action: "blocked-removal", model: { key: "posts" } },
    ],
  });

  const emptyRemoval = planConfigurationSynchronization({ models: [], storedModels: [stored()] });
  expect(emptyRemoval).toMatchObject({
    diagnostics: [],
    isValid: true,
    operations: [{ action: "remove", model: { key: "posts" } }],
  });

  const snapshotChange = planConfigurationSynchronization({
    models: [model({ structureHash: "structure-b", version: 2 })],
    storedModels: [stored({ draftSnapshotCount: 1, publishedSnapshotCount: 2 })],
  });
  expect(snapshotChange).toMatchObject({
    isValid: false,
    operations: [{ action: "incompatible-change", model: { key: "posts" } }],
  });
  expect(snapshotChange.diagnostics[0].message).toContain("draft=1, published=2");
});

test("rejects duplicate and ambiguous synchronization identity evidence", () => {
  const duplicateStored = planConfigurationSynchronization({
    models: [],
    storedModels: [stored(), stored({ projectionHash: "projection-b" })],
  });
  expect(duplicateStored).toMatchObject({
    isValid: false,
    diagnostics: [{ code: "DUPLICATE_STORED_MODEL", modelKey: "posts" }],
  });

  const missingRename = planConfigurationSynchronization({
    models: [model({ key: "articles", renamedFrom: "missing" })],
    storedModels: [],
  });
  expect(missingRename).toMatchObject({
    isValid: false,
    diagnostics: [{ code: "RENAME_SOURCE_MISSING", relatedModelKey: "missing" }],
  });

  const configuredRenameSource = planConfigurationSynchronization({
    models: [model(), model({ key: "articles", renamedFrom: "posts" })],
    storedModels: [stored()],
  });
  expect(configuredRenameSource).toMatchObject({
    isValid: false,
    diagnostics: [{ code: "RENAME_SOURCE_STILL_CONFIGURED", modelKey: "articles" }],
  });
});

test("renders canonical deterministic reports and check outcomes", () => {
  const input = {
    models: [model({ key: "zebra" }), model({ key: "articles" })],
    storedModels: [stored({ key: "zebra" }), stored({ key: "articles" })],
  };
  const first = planConfigurationSynchronization(input);
  const second = planConfigurationSynchronization({
    models: [...input.models].reverse(),
    storedModels: [...input.storedModels].reverse(),
  });
  expect(renderConfigurationSyncPlanJson(first)).toBe(renderConfigurationSyncPlanJson(second));
  expect(renderConfigurationSyncPlanText(first)).toContain("Apply required: no");
  expect(reportConfigurationSynchronization(first).check.exitCode).toBe(0);

  const pending = planConfigurationSynchronization({ models: [model()], storedModels: [] });
  expect(checkConfigurationSynchronization(pending).exitCode).toBe(1);
});

test("prepares a detached dry run and materializes page defaults only for apply", async () => {
  const page = {
    ...definePage({
      fields: {
        greeting: field.text({ defaultValue: "Hello" }),
        required: field.text({ required: true }),
      },
      key: "home",
      path: "/",
      version: 1,
    }),
    projectionHash: "projection-home",
    structureHash: "structure-home",
  };
  const state = {
    async readConfigurationSyncState() {
      return [];
    },
  };
  const prepared = await prepareConfigurationSynchronization({ models: [page], state });
  expect(prepared.report.check.exitCode).toBe(1);
  expect(prepared.storedModels).toEqual([]);
  const pageEntry = createConfigurationSyncPageEntry({
    appliedAt: 1,
    entryId: "entry-home",
    model: page,
    snapshotId: "snapshot-home",
  });
  expect(pageEntry.entry.draft).toMatchObject({
    blocks: [],
    fields: { greeting: "Hello" },
    title: "home",
    updatedBy: contentSyncActor,
  });

  let received;
  await applyPreparedConfigurationSynchronization({
    clock: { now: () => 1 },
    ids: {
      next: (() => {
        let id = 0;
        return () => `id-${++id}`;
      })(),
    },
    models: [page],
    prepared,
    target: {
      async applyConfigurationSynchronization(input) {
        received = input;
        return { operations: input.plan.operations, status: "applied", targetVersion: 1 };
      },
    },
  });
  expect(received.pageEntries[0].entry.draft.fields).toEqual({ greeting: "Hello" });
});

test("resolves portable actor display names and ASCII-only search folding", () => {
  expect(actorDisplayName("user-1", "  Ada  ")).toBe("Ada");
  expect(actorDisplayName("user-1", "   ")).toBe("Unknown user");
  expect(actorDisplayName("user-1", null)).toBe("Unknown user");
  expect(actorDisplayName("system:content-sync")).toBe("System");
  expect(foldAscii("Launch ÄÖ Q")).toBe("launch ÄÖ q");
});

test("plans a list-field change as a projection-only label update", async () => {
  const collection = (listFields) =>
    defineCollection({
      fields: { author: field.text() },
      key: "posts",
      ...(listFields === undefined ? {} : { listFields }),
      route: "/blog/:slug",
      version: 1,
    });
  const [before, after] = await Promise.all([
    defineConfig({ content: [collection()] }),
    defineConfig({ content: [collection(["author"])] }),
  ]);
  const storedModel = before.content[0];
  const plan = planConfigurationSynchronization({
    models: after.content,
    storedModels: [
      {
        draftSnapshotCount: 3,
        entryCount: 3,
        key: storedModel.key,
        kind: storedModel.kind,
        projectionHash: storedModel.projectionHash,
        publishedSnapshotCount: 2,
        structureHash: storedModel.structureHash,
        version: storedModel.version,
      },
    ],
  });
  expect(plan.isValid).toBe(true);
  expect(plan.operations).toMatchObject([{ action: "label-update", model: { key: "posts" } }]);
});

const mediaEditor = { id: "editor-1", role: "editor" };
const mediaViewer = { id: "viewer-1", role: "viewer" };
const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

function mediaRecord(overrides = {}) {
  return {
    createdAt: 1,
    createdBy: "editor-1",
    filename: "cover.png",
    height: 2,
    id: "media-1",
    mimeType: "image/png",
    size: 12,
    status: "active",
    storageKey: "media/media-1",
    updatedAt: 1,
    width: 3,
    ...overrides,
  };
}

function catalogItem(overrides = {}) {
  return {
    createdBy: { displayName: "Ada", id: "editor-1" },
    media: mediaRecord(overrides),
    usageCount: 0,
  };
}

function mediaUseCases(media, overrides = {}) {
  return new MediaUseCases({
    clock: { now: () => 5 },
    idGenerator: { next: () => "media-1" },
    imageInspector: { inspect: async () => ({ height: 2, width: 3 }) },
    logger: { error() {} },
    media,
    storage: {
      async delete() {},
      async get() {
        return null;
      },
      async put(input) {
        return { contentType: input.contentType, key: input.key, size: pngBytes.byteLength };
      },
    },
    ...overrides,
  });
}

function bytes(value) {
  return {
    async *[Symbol.asyncIterator]() {
      yield value;
    },
  };
}

test("validates and defaults media list queries before reading", async () => {
  const reads = [];
  const media = mediaUseCases({
    async listMedia(input) {
      reads.push(input);
      return { items: [catalogItem({ id: "media-2" })] };
    },
  });
  await expect(media.list({ actor: mediaViewer, limit: 10 })).resolves.toEqual({
    items: [
      expect.objectContaining({
        createdBy: { displayName: "Ada", id: "editor-1" },
        id: "media-2",
        usageCount: 0,
      }),
    ],
  });
  expect(reads).toEqual([{ limit: 10, sort: "-createdAt" }]);
  expect(reads[0]).not.toHaveProperty("q");

  await media.list({
    actor: mediaViewer,
    limit: 5,
    q: "  Cover  ",
    sort: "size",
    type: "image/png",
  });
  expect(reads[1]).toEqual({ limit: 5, q: "Cover", sort: "size", type: "image/png" });
  await media.list({ actor: mediaViewer, limit: 5, q: "   " });
  expect(reads[2]).toEqual({ limit: 5, sort: "-createdAt" });

  for (const query of [{ q: "x".repeat(201) }, { type: "image/svg+xml" }, { sort: "width" }]) {
    await expect(media.list({ actor: mediaViewer, limit: 5, ...query })).rejects.toMatchObject({
      code: "CONTENT_INVALID_STATE",
    });
  }
  expect(reads).toHaveLength(3);
});

test("returns media details with bounded usage and uploader names", async () => {
  const usage = Array.from({ length: 51 }, (_, index) => ({
    entryId: `post-${index}`,
    locations: [{ field: "cover", source: "field", states: ["draft", "published"] }],
    modelKey: "posts",
    status: "published",
    title: `Post ${index}`,
  }));
  const requests = [];
  const media = mediaUseCases({
    async loadMediaCatalogItem(id) {
      return id === "media-1" ? { ...catalogItem(), usageCount: 51 } : null;
    },
    async loadMediaUsage(input) {
      requests.push(input);
      return usage;
    },
  });
  const detail = await media.get({ actor: mediaViewer, mediaId: "media-1" });
  expect(detail).toMatchObject({
    createdBy: { displayName: "Ada", id: "editor-1" },
    id: "media-1",
    usageCount: 51,
  });
  expect(detail).not.toHaveProperty("storageKey");
  expect(detail.usage).toHaveLength(50);
  expect(detail.usage[0]).toEqual(usage[0]);
  expect(requests).toEqual([{ limit: 50, mediaId: "media-1" }]);
  await expect(media.get({ actor: mediaViewer, mediaId: "missing" })).resolves.toBeNull();
});

test("reloads catalog views after create and deletion commands", async () => {
  const cleanup = [];
  const loads = [];
  let reload = catalogItem();
  const port = {
    async createMedia(input) {
      return mediaRecord({ id: input.id });
    },
    async loadMediaCatalogItem(id) {
      loads.push(id);
      return reload;
    },
    async markForDeletion() {
      return { media: mediaRecord({ status: "deleting" }), status: "deleting" };
    },
    async retryDeletion() {
      throw new DomainError("MEDIA_IN_USE", "Media is still referenced by content.");
    },
  };
  const media = mediaUseCases(port, {
    storage: {
      async delete(key) {
        cleanup.push(key);
      },
      async put(input) {
        return { contentType: input.contentType, key: input.key, size: pngBytes.byteLength };
      },
    },
  });
  await expect(
    media.create({ actor: mediaEditor, body: bytes(pngBytes), filename: "cover.png" }),
  ).resolves.toMatchObject({ createdBy: { displayName: "Ada" }, usageCount: 0 });
  reload = { ...catalogItem({ status: "deleting" }), usageCount: 0 };
  await expect(
    media.requestDeletion({ actor: mediaEditor, mediaId: "media-1" }),
  ).resolves.toMatchObject({ status: "deleting", usageCount: 0 });
  await expect(
    media.retryDeletion({ actor: mediaEditor, mediaId: "media-1" }),
  ).rejects.toMatchObject({ code: "MEDIA_IN_USE" });
  expect(loads).toEqual(["media-1", "media-1"]);

  reload = null;
  await expect(
    media.create({ actor: mediaEditor, body: bytes(pngBytes), filename: "cover.png" }),
  ).rejects.toThrow("Created media could not be reloaded.");
  expect(cleanup).toEqual([]);
});
