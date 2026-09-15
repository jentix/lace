import {
  DomainError,
  actorId,
  blockKey,
  contentEntryId,
  contentSnapshotId,
  mediaId,
  siteBuildId,
  unixMilliseconds,
} from "@lacecms/domain";
import * as v from "valibot";
import { describe, expect, test } from "vitest";
import {
  buildExportSchema,
  classifyError,
  contentEntryListSchema,
  contentEntrySchema,
  contentModelListSchema,
  createContentEntryRequestSchema,
  deleteContentEntryRequestSchema,
  entityTagForVersion,
  entityTagSchema,
  fromIsoTimestamp,
  idempotencyKeySchema,
  isoTimestampSchema,
  jsonPointerSchema,
  mediaMetadataSchema,
  opaqueCursorSchema,
  packageName,
  publishContentEntryRequestSchema,
  resolveExpectedRevision,
  saveDraftRequestSchema,
  siteBuildSchema,
  toBuildExportDto,
  toContentEntryDto,
  toContentModelDto,
  toIsoTimestamp,
  toMediaMetadataDto,
  toSiteBuildDto,
  transportError,
  validationError,
  versionFromEntityTag,
} from "../dist/index.js";

const timestamp = unixMilliseconds(1_735_689_600_000);
const actor = { id: actorId("actor-1"), role: "admin" };
const block = {
  data: { heading: "Welcome" },
  key: blockKey("hero-1"),
  position: 1_000,
  schemaVersion: 1,
  type: "hero",
};
const draft = {
  blocks: [block],
  createdAt: timestamp,
  entryId: contentEntryId("entry-1"),
  fields: { author: "Lace" },
  id: contentSnapshotId("snapshot-draft-1"),
  revision: 4,
  slug: "welcome",
  state: "draft",
  title: "Welcome",
  updatedAt: timestamp,
  updatedBy: actor,
};
const published = {
  ...draft,
  id: contentSnapshotId("snapshot-published-1"),
  state: "published",
};
const entry = {
  draft,
  id: contentEntryId("entry-1"),
  model: { key: "posts", kind: "collection", route: "/blog/:slug" },
  published,
};

describe("shared REST contract DTOs", () => {
  test("exports its package identity", () => expect(packageName).toBe("@lacecms/contracts"));

  test("round-trips portable entries, exports, media, builds, and timestamps", () => {
    const entryDto = toContentEntryDto(entry);
    expect(v.parse(contentEntrySchema, entryDto)).toEqual(entryDto);
    expect(
      v.parse(contentEntryListSchema, {
        items: [
          {
            draftRevision: 4,
            id: "entry-1",
            modelKey: "posts",
            publishedSnapshotId: "snapshot-published-1",
            title: "Welcome",
            updatedAt: toIsoTimestamp(timestamp),
          },
        ],
        nextCursor: "opaque-next-page",
      }),
    ).toMatchObject({ items: [{ id: "entry-1" }], nextCursor: "opaque-next-page" });

    const exportDto = toBuildExportDto({
      entries: [{ entry, path: "/blog/welcome" }],
      version: 7,
    });
    expect(v.parse(buildExportSchema, exportDto)).toEqual(exportDto);

    const mediaDto = toMediaMetadataDto(
      {
        createdAt: timestamp,
        createdBy: actor.id,
        filename: "cover.png",
        height: 600,
        id: mediaId("media-1"),
        mimeType: "image/png",
        size: 42,
        status: "active",
        storageKey: "private/media-1",
        updatedAt: timestamp,
        width: 800,
      },
      "https://lace.example/api/v1/public/media/media-1",
    );
    expect(v.parse(mediaMetadataSchema, mediaDto)).toEqual(mediaDto);
    expect(mediaDto).not.toHaveProperty("storageKey");

    const buildDto = toSiteBuildDto({
      id: siteBuildId("build-1"),
      publishedSnapshotId: published.id,
      requestedAt: timestamp,
      requestedBy: actor.id,
      status: "pending",
      targetVersion: 7,
    });
    expect(v.parse(siteBuildSchema, buildDto)).toEqual(buildDto);

    const modelDto = toContentModelDto({
      blocks: ["hero"],
      fields: { author: { type: "text" } },
      key: "posts",
      kind: "collection",
      label: "Posts",
      route: "/blog/:slug",
      version: 1,
    });
    expect(v.parse(contentModelListSchema, { items: [modelDto] })).toEqual({ items: [modelDto] });
    expect(fromIsoTimestamp(toIsoTimestamp(timestamp))).toBe(timestamp);
  });

  test("accepts complete mutation request contracts", () => {
    const draftRequest = {
      blocks: [
        {
          data: { heading: "Welcome" },
          key: "hero-1",
          position: 1_000,
          schemaVersion: 1,
          type: "hero",
        },
      ],
      expectedRevision: 4,
      fields: { author: "Lace" },
      slug: "welcome",
      title: "Welcome",
    };
    const { expectedRevision: _expectedRevision, ...createRequest } = draftRequest;
    expect(v.parse(createContentEntryRequestSchema, createRequest)).toMatchObject({
      title: "Welcome",
    });
    expect(v.parse(saveDraftRequestSchema, draftRequest)).toEqual(draftRequest);
    expect(v.parse(publishContentEntryRequestSchema, { expectedRevision: 4 })).toEqual({
      expectedRevision: 4,
    });
    expect(v.parse(deleteContentEntryRequestSchema, { expectedRevision: 4 })).toEqual({
      expectedRevision: 4,
    });
  });
});

describe("shared REST transport conventions", () => {
  test("uses canonical ISO timestamps and version-derived entity tags", () => {
    expect(toIsoTimestamp(timestamp)).toBe("2025-01-01T00:00:00.000Z");
    expect(entityTagForVersion(7)).toBe('"7"');
    expect(versionFromEntityTag('"7"')).toBe(7);
  });

  test("normalizes body and If-Match revisions only when they agree", () => {
    expect(resolveExpectedRevision({ expectedRevision: 4 })).toBe(4);
    expect(resolveExpectedRevision({ ifMatch: '"4"' })).toBe(4);
    expect(resolveExpectedRevision({ expectedRevision: 4, ifMatch: '"4"' })).toBe(4);
    expect(() => resolveExpectedRevision({ expectedRevision: 4, ifMatch: '"5"' })).toThrow(
      "must agree",
    );
    expect(() => resolveExpectedRevision({ ifMatch: "5" })).toThrow("ETag");
    expect(() => resolveExpectedRevision({})).toThrow("required");
  });

  test("maps known errors and validation issues without exposing exception text", () => {
    const conflict = classifyError(new DomainError("CONTENT_REVISION_CONFLICT", "sql: secret"));
    expect(conflict).toEqual({
      body: {
        error: {
          code: "CONTENT_REVISION_CONFLICT",
          message: "The draft was modified by another request.",
        },
      },
      status: 409,
    });
    expect(JSON.stringify(classifyError(new Error("select * from secrets")))).not.toContain(
      "secrets",
    );
    expect(
      validationError([{ code: "invalid_type", message: "must be text", path: "/fields/title" }]),
    ).toEqual({
      body: {
        error: {
          code: "VALIDATION_FAILED",
          details: {
            issues: [{ code: "invalid_type", message: "must be text", path: "/fields/title" }],
          },
          message: "The request did not satisfy the API contract.",
        },
      },
      status: 422,
    });
  });

  test("renders stable sanitized HTTP boundary errors", () => {
    expect(transportError("NOT_FOUND")).toEqual({
      body: { error: { code: "NOT_FOUND", message: "The requested resource was not found." } },
      status: 404,
    });
    expect(transportError("RATE_LIMITED")).toEqual({
      body: { error: { code: "RATE_LIMITED", message: "Too many requests were received." } },
      status: 429,
    });
    expect(transportError("PAYLOAD_TOO_LARGE")).toEqual({
      body: { error: { code: "PAYLOAD_TOO_LARGE", message: "The request body is too large." } },
      status: 413,
    });
  });
});

describe("invalid shared REST payloads", () => {
  test("rejects unknown keys and invalid mutation values", () => {
    expect(
      v.safeParse(saveDraftRequestSchema, {
        blocks: [],
        fields: {},
        title: "Welcome",
        unknown: true,
      }).success,
    ).toBe(false);
    expect(
      v.safeParse(saveDraftRequestSchema, {
        blocks: [],
        expectedRevision: -1,
        fields: {},
        title: "Welcome",
      }).success,
    ).toBe(false);
    expect(
      v.safeParse(createContentEntryRequestSchema, { blocks: [], fields: {}, title: "" }).success,
    ).toBe(false);
  });

  test("rejects malformed timestamps, cursors, entity tags, idempotency keys, and issue paths", () => {
    expect(v.safeParse(isoTimestampSchema, "2025-01-01T00:00:00Z").success).toBe(false);
    expect(v.safeParse(opaqueCursorSchema, "").success).toBe(false);
    expect(v.safeParse(entityTagSchema, "7").success).toBe(false);
    expect(v.safeParse(idempotencyKeySchema, "bad\nkey").success).toBe(false);
    expect(v.safeParse(jsonPointerSchema, "fields.title").success).toBe(false);
  });
});
