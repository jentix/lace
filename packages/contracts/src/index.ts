import type { JsonObject, JsonValue } from "@lacecms/content";
import { DomainError, unixMilliseconds } from "@lacecms/domain";
import type {
  ContentBlock,
  ContentEntry,
  ContentModelKind,
  ContentModelRoute,
  ContentSnapshot,
  DomainErrorCode,
  MediaMetadata,
  SiteBuildState,
  UnixMilliseconds,
} from "@lacecms/domain";
import * as v from "valibot";

export const packageName = "@lacecms/contracts";

const identifierSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(255));
const nonNegativeIntegerSchema = v.pipe(v.number(), v.integer(), v.minValue(0));
const utcTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const entityTagPattern = /^"[0-9]+"$/u;
const idempotencyKeyPattern = /^[\x21-\x7e]{1,255}$/u;
const jsonPointerPattern = /^(?:\/(?:[^~/]|~[01])*)*$/u;

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return true;
  }
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return (
    (prototype === null || prototype === Object.prototype) &&
    Object.values(value).every(isJsonValue)
  );
}

function isJsonObject(value: unknown): value is JsonObject {
  return !Array.isArray(value) && value !== null && typeof value === "object" && isJsonValue(value);
}

function isUtcTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    utcTimestampPattern.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

/** Any portable JSON value accepted by the shared transport contract. */
export const jsonValueSchema = v.custom<JsonValue>(isJsonValue);
export const jsonObjectSchema = v.custom<JsonObject>(isJsonObject);
export const identifierSchemaPublic = identifierSchema;
export const expectedRevisionSchema = nonNegativeIntegerSchema;
export const opaqueCursorSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(4_096));
export const isoTimestampSchema = v.custom<string>(isUtcTimestamp);
export const entityTagSchema = v.pipe(v.string(), v.regex(entityTagPattern));
export const idempotencyKeySchema = v.pipe(v.string(), v.regex(idempotencyKeyPattern));
export const jsonPointerSchema = v.pipe(v.string(), v.regex(jsonPointerPattern));

export type OpaqueCursorDto = v.InferOutput<typeof opaqueCursorSchema>;
export type IsoTimestamp = v.InferOutput<typeof isoTimestampSchema>;
export type EntityTag = v.InferOutput<typeof entityTagSchema>;
export type IdempotencyKey = v.InferOutput<typeof idempotencyKeySchema>;

/** Converts a portable Unix-millisecond value into the canonical JSON timestamp. */
export function toIsoTimestamp(value: UnixMilliseconds | number): IsoTimestamp {
  const timestamp = new Date(value);
  if (!Number.isFinite(value) || Number.isNaN(timestamp.getTime())) {
    throw new TypeError("A timestamp must be a finite Unix-millisecond value.");
  }
  return timestamp.toISOString() as IsoTimestamp;
}

/** Parses a canonical JSON timestamp into a portable Unix-millisecond value. */
export function fromIsoTimestamp(value: string): UnixMilliseconds {
  const parsed = v.safeParse(isoTimestampSchema, value);
  if (!parsed.success) throw new TypeError("A timestamp must be canonical ISO-8601 UTC.");
  return unixMilliseconds(Date.parse(parsed.output));
}

/** Derives the build-export entity tag from the published-state version. */
export function entityTagForVersion(version: number): EntityTag {
  const parsed = v.safeParse(nonNegativeIntegerSchema, version);
  if (!parsed.success) throw new TypeError("An ETag version must be a non-negative integer.");
  return `"${parsed.output}"` as EntityTag;
}

/** Parses the version encoded in a supported, version-derived entity tag. */
export function versionFromEntityTag(value: string): number {
  const parsed = v.safeParse(entityTagSchema, value);
  if (!parsed.success) throw new TypeError("An ETag must be a quoted non-negative integer.");
  const version = Number(parsed.output.slice(1, -1));
  if (!Number.isSafeInteger(version))
    throw new TypeError("An ETag version must be a safe integer.");
  return version;
}

export const contentModelRouteSchema = v.union([
  v.strictObject({ kind: v.literal("page"), key: identifierSchema, path: v.string() }),
  v.strictObject({ kind: v.literal("collection"), key: identifierSchema, route: v.string() }),
]);

export const actorSchema = v.strictObject({
  id: identifierSchema,
  role: v.picklist(["admin", "editor", "viewer"]),
});

export const contentBlockSchema = v.strictObject({
  data: jsonObjectSchema,
  key: identifierSchema,
  position: nonNegativeIntegerSchema,
  schemaVersion: v.pipe(v.number(), v.integer(), v.minValue(1)),
  type: identifierSchema,
});

const snapshotFields = {
  blocks: v.array(contentBlockSchema),
  createdAt: isoTimestampSchema,
  entryId: identifierSchema,
  fields: jsonObjectSchema,
  id: identifierSchema,
  revision: nonNegativeIntegerSchema,
  slug: v.optional(identifierSchema),
  title: v.pipe(v.string(), v.minLength(1), v.maxLength(200)),
  updatedAt: isoTimestampSchema,
  updatedBy: actorSchema,
};

export const draftSnapshotSchema = v.strictObject({ ...snapshotFields, state: v.literal("draft") });
export const publishedSnapshotSchema = v.strictObject({
  ...snapshotFields,
  state: v.literal("published"),
});
export const contentSnapshotSchema = v.union([draftSnapshotSchema, publishedSnapshotSchema]);

export const contentEntrySchema = v.strictObject({
  draft: draftSnapshotSchema,
  id: identifierSchema,
  model: contentModelRouteSchema,
  published: v.optional(publishedSnapshotSchema),
});

export const contentEntrySummarySchema = v.strictObject({
  draftRevision: nonNegativeIntegerSchema,
  id: identifierSchema,
  modelKey: identifierSchema,
  publishedSnapshotId: v.optional(identifierSchema),
  title: v.pipe(v.string(), v.minLength(1), v.maxLength(200)),
  updatedAt: isoTimestampSchema,
});

export function cursorPageSchema<
  ItemSchema extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
>(itemSchema: ItemSchema) {
  return v.strictObject({
    items: v.array(itemSchema),
    nextCursor: v.optional(opaqueCursorSchema),
  });
}

export const contentEntryListSchema = cursorPageSchema(contentEntrySummarySchema);

const editableDraftFields = {
  blocks: v.array(contentBlockSchema),
  fields: jsonObjectSchema,
  slug: v.optional(identifierSchema),
  title: v.pipe(v.string(), v.minLength(1), v.maxLength(200)),
};

export const createContentEntryRequestSchema = v.strictObject(editableDraftFields);
export const saveDraftRequestSchema = v.strictObject({
  ...editableDraftFields,
  expectedRevision: v.optional(expectedRevisionSchema),
});
export const publishContentEntryRequestSchema = v.strictObject({
  expectedRevision: v.optional(expectedRevisionSchema),
});
export const deleteContentEntryRequestSchema = v.strictObject({
  expectedRevision: v.optional(expectedRevisionSchema),
});

export const contentModelSchema = v.strictObject({
  blocks: v.array(identifierSchema),
  description: v.optional(v.string()),
  fields: jsonObjectSchema,
  key: identifierSchema,
  kind: v.picklist(["collection", "page"]),
  label: v.optional(v.string()),
  path: v.optional(v.string()),
  route: v.optional(v.string()),
  version: v.pipe(v.number(), v.integer(), v.minValue(1)),
});
export const contentModelListSchema = v.strictObject({ items: v.array(contentModelSchema) });

export const publicContentEntrySchema = v.strictObject({
  entry: contentEntrySchema,
  path: v.string(),
});
export const publicContentListSchema = cursorPageSchema(publicContentEntrySchema);
export const buildExportSchema = v.strictObject({
  entries: v.array(publicContentEntrySchema),
  version: nonNegativeIntegerSchema,
});

export const mediaMetadataSchema = v.strictObject({
  createdAt: isoTimestampSchema,
  createdBy: identifierSchema,
  filename: v.string(),
  height: v.optional(nonNegativeIntegerSchema),
  id: identifierSchema,
  mimeType: v.string(),
  size: nonNegativeIntegerSchema,
  status: v.picklist(["active", "delete_failed", "deleting"]),
  updatedAt: isoTimestampSchema,
  url: v.string(),
  width: v.optional(nonNegativeIntegerSchema),
});

export const siteBuildSchema = v.strictObject({
  id: identifierSchema,
  publishedSnapshotId: v.optional(identifierSchema),
  requestedAt: isoTimestampSchema,
  requestedBy: identifierSchema,
  status: v.picklist(["failed", "pending", "running", "succeeded"]),
  targetVersion: nonNegativeIntegerSchema,
});

export const contractValidationIssueSchema = v.strictObject({
  code: identifierSchema,
  message: v.string(),
  path: jsonPointerSchema,
});

export const errorCodeSchema = v.picklist([
  "AUTHORIZATION_DENIED",
  "CONTENT_INVALID_STATE",
  "CONTENT_MODEL_CARDINALITY_CONFLICT",
  "CONTENT_PUBLISHED_IMMUTABLE",
  "CONTENT_REVISION_CONFLICT",
  "CONTENT_ROUTE_CONFLICT",
  "INTERNAL_ERROR",
  "VALIDATION_FAILED",
]);

export const errorEnvelopeSchema = v.strictObject({
  error: v.strictObject({
    code: errorCodeSchema,
    details: v.optional(jsonObjectSchema),
    message: v.string(),
  }),
});

export type ContentEntryDto = v.InferOutput<typeof contentEntrySchema>;
export type ContentSnapshotDto = v.InferOutput<typeof contentSnapshotSchema>;
export type ContentBlockDto = v.InferOutput<typeof contentBlockSchema>;
export type MediaMetadataDto = v.InferOutput<typeof mediaMetadataSchema>;
export type SiteBuildDto = v.InferOutput<typeof siteBuildSchema>;
export type ErrorEnvelope = v.InferOutput<typeof errorEnvelopeSchema>;
export type ContractValidationIssue = v.InferOutput<typeof contractValidationIssueSchema>;

/** Maps a portable route without importing configuration or persistence types. */
export function toContentModelRouteDto(route: ContentModelRoute) {
  return route.kind === "page"
    ? { kind: "page" as const, key: route.key, path: route.path }
    : { kind: "collection" as const, key: route.key, route: route.route };
}

export function toContentBlockDto(block: ContentBlock): ContentBlockDto {
  return {
    data: block.data,
    key: block.key,
    position: block.position,
    schemaVersion: block.schemaVersion,
    type: block.type,
  };
}

export function toContentSnapshotDto(snapshot: ContentSnapshot): ContentSnapshotDto {
  const base = {
    blocks: snapshot.blocks.map(toContentBlockDto),
    createdAt: toIsoTimestamp(snapshot.createdAt),
    entryId: snapshot.entryId,
    fields: snapshot.fields,
    id: snapshot.id,
    revision: snapshot.revision,
    ...(snapshot.slug === undefined ? {} : { slug: snapshot.slug }),
    title: snapshot.title,
    updatedAt: toIsoTimestamp(snapshot.updatedAt),
    updatedBy: snapshot.updatedBy,
  };
  return snapshot.state === "draft" ? { ...base, state: "draft" } : { ...base, state: "published" };
}

export function toContentEntryDto(entry: ContentEntry): ContentEntryDto {
  return {
    draft: toContentSnapshotDto(entry.draft) as v.InferOutput<typeof draftSnapshotSchema>,
    id: entry.id,
    model: toContentModelRouteDto(entry.model),
    ...(entry.published === undefined
      ? {}
      : {
          published: toContentSnapshotDto(entry.published) as v.InferOutput<
            typeof publishedSnapshotSchema
          >,
        }),
  };
}

/** Maps metadata without exposing the private storage key. */
export function toMediaMetadataDto(media: MediaMetadata, url: string): MediaMetadataDto {
  return {
    createdAt: toIsoTimestamp(media.createdAt),
    createdBy: media.createdBy,
    filename: media.filename,
    ...(media.height === undefined ? {} : { height: media.height }),
    id: media.id,
    mimeType: media.mimeType,
    size: media.size,
    status: media.status,
    updatedAt: toIsoTimestamp(media.updatedAt),
    url,
    ...(media.width === undefined ? {} : { width: media.width }),
  };
}

export function toSiteBuildDto(build: SiteBuildState): SiteBuildDto {
  return {
    id: build.id,
    ...(build.publishedSnapshotId === undefined
      ? {}
      : { publishedSnapshotId: build.publishedSnapshotId }),
    requestedAt: toIsoTimestamp(build.requestedAt),
    requestedBy: build.requestedBy,
    status: build.status,
    targetVersion: build.targetVersion,
  };
}

export interface BuildExportSource {
  readonly entries: readonly { readonly entry: ContentEntry; readonly path: string }[];
  readonly version: number;
}

export function toBuildExportDto(
  value: BuildExportSource,
): v.InferOutput<typeof buildExportSchema> {
  return {
    entries: value.entries.map(({ entry, path }) => ({ entry: toContentEntryDto(entry), path })),
    version: value.version,
  };
}

export interface ContentModelSource {
  readonly blocks: readonly string[];
  readonly description?: string;
  readonly fields: JsonObject;
  readonly key: string;
  readonly kind: ContentModelKind;
  readonly label?: string;
  readonly path?: string;
  readonly route?: string;
  readonly version: number;
}

export function toContentModelDto(
  model: ContentModelSource,
): v.InferOutput<typeof contentModelSchema> {
  return {
    blocks: [...model.blocks],
    ...(model.description === undefined ? {} : { description: model.description }),
    fields: model.fields,
    key: model.key,
    kind: model.kind,
    ...(model.label === undefined ? {} : { label: model.label }),
    ...(model.path === undefined ? {} : { path: model.path }),
    ...(model.route === undefined ? {} : { route: model.route }),
    version: model.version,
  };
}

export interface RevisionPreconditionInput {
  readonly expectedRevision?: number;
  readonly ifMatch?: string;
}

/** Normalizes equivalent HTTP/body preconditions into the application revision value. */
export function resolveExpectedRevision(input: RevisionPreconditionInput): number {
  const body =
    input.expectedRevision === undefined
      ? undefined
      : v.safeParse(expectedRevisionSchema, input.expectedRevision);
  if (body !== undefined && !body.success) {
    throw new TypeError("expectedRevision must be a non-negative integer.");
  }
  const header = input.ifMatch === undefined ? undefined : versionFromEntityTag(input.ifMatch);
  if (body === undefined && header === undefined) {
    throw new TypeError("An expected revision is required.");
  }
  if (body !== undefined && header !== undefined && body.output !== header) {
    throw new TypeError("expectedRevision and If-Match must agree.");
  }
  return body?.output ?? header!;
}

const domainErrorStatus: Readonly<Record<DomainErrorCode, 403 | 409 | 422>> = {
  AUTHORIZATION_DENIED: 403,
  CONTENT_INVALID_STATE: 422,
  CONTENT_MODEL_CARDINALITY_CONFLICT: 409,
  CONTENT_PUBLISHED_IMMUTABLE: 409,
  CONTENT_REVISION_CONFLICT: 409,
  CONTENT_ROUTE_CONFLICT: 409,
};

const domainErrorMessage: Readonly<Record<DomainErrorCode, string>> = {
  AUTHORIZATION_DENIED: "The actor is not permitted to perform this operation.",
  CONTENT_INVALID_STATE: "The requested content operation is invalid.",
  CONTENT_MODEL_CARDINALITY_CONFLICT: "The content model cannot accept another entry.",
  CONTENT_PUBLISHED_IMMUTABLE: "Published content cannot be modified.",
  CONTENT_REVISION_CONFLICT: "The draft was modified by another request.",
  CONTENT_ROUTE_CONFLICT: "The public route is already in use.",
};

export interface ClassifiedError {
  readonly body: ErrorEnvelope;
  readonly status: 403 | 409 | 422 | 500;
}

/** Converts known domain failures to documented safe transport responses. */
export function classifyError(error: unknown): ClassifiedError {
  if (error instanceof DomainError) {
    return {
      body: { error: { code: error.code, message: domainErrorMessage[error.code] } },
      status: domainErrorStatus[error.code],
    };
  }
  return {
    body: { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } },
    status: 500,
  };
}

/** Creates a safe validation envelope from already-normalized contract issues. */
export function validationError(issues: readonly ContractValidationIssue[]): ClassifiedError {
  return {
    body: {
      error: {
        code: "VALIDATION_FAILED",
        details: { issues: [...issues] },
        message: "The request did not satisfy the API contract.",
      },
    },
    status: 422,
  };
}
