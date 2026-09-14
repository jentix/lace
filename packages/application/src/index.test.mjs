import { expect, test } from "vitest";
import {
  dispatcherEventId,
  dispatcherLeaseId,
  checkConfigurationSynchronization,
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
} from "../dist/index.js";
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
