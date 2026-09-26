import { canonicalizeJson, defineBlock, field, toBlockMetadata } from "@lacecms/content";
import type { BlockMetadata, FieldMetadata, JsonObject, JsonValue } from "@lacecms/content";
import { DomainError, unixMilliseconds } from "@lacecms/domain";
import type {
  ContentBlock,
  ContentEntry,
  ContentModelKind,
  ContentModelRoute,
  ContentSnapshot,
  DomainErrorCode,
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

export type FieldMetadataMapDto = Readonly<Record<string, FieldMetadata>>;

function isFieldMetadata(value: unknown): value is FieldMetadata {
  if (!isJsonObject(value) || typeof value.type !== "string") return false;
  const { type, ...options } = value;
  try {
    const normalized =
      type === "boolean"
        ? field.boolean(options)
        : type === "date"
          ? field.date(options)
          : type === "datetime"
            ? field.datetime(options)
            : type === "media"
              ? field.media(options)
              : type === "number"
                ? field.number(options)
                : type === "richText"
                  ? field.richText(options)
                  : type === "select"
                    ? field.select(options as { readonly options: readonly [string, ...string[]] })
                    : type === "text"
                      ? field.text(options)
                      : type === "textarea"
                        ? field.textarea(options)
                        : type === "url"
                          ? field.url(options)
                          : undefined;
    return (
      normalized !== undefined &&
      canonicalizeJson(value) === canonicalizeJson(normalized as unknown as JsonValue)
    );
  } catch {
    return false;
  }
}

function isFieldMetadataMap(value: unknown): value is FieldMetadataMapDto {
  return (
    isJsonObject(value) &&
    Object.entries(value).every(
      ([key, definition]) => /^[A-Za-z][A-Za-z0-9]*$/u.test(key) && isFieldMetadata(definition),
    )
  );
}

function isBlockMetadata(value: unknown): value is BlockMetadata {
  if (!isJsonObject(value)) return false;
  const allowedKeys = new Set([
    "defaultValue",
    "description",
    "fields",
    "label",
    "type",
    "version",
  ]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) return false;
  if (
    typeof value.type !== "string" ||
    !/^[A-Za-z][A-Za-z0-9-]*$/u.test(value.type) ||
    typeof value.version !== "number" ||
    !Number.isSafeInteger(value.version) ||
    value.version < 1 ||
    (value.label !== undefined && typeof value.label !== "string") ||
    (value.description !== undefined && typeof value.description !== "string") ||
    !isFieldMetadataMap(value.fields) ||
    (value.defaultValue !== undefined && !isJsonObject(value.defaultValue))
  ) {
    return false;
  }
  try {
    const normalized = defineBlock({
      ...(value.defaultValue === undefined ? {} : { defaultValue: value.defaultValue }),
      ...(value.description === undefined ? {} : { description: value.description }),
      fields: value.fields,
      ...(value.label === undefined ? {} : { label: value.label }),
      type: value.type,
      version: value.version,
    });
    return (
      canonicalizeJson(value) ===
      canonicalizeJson(toBlockMetadata(normalized) as unknown as JsonValue)
    );
  } catch {
    return false;
  }
}

function hasMatchingBlockDefinitions<
  Value extends {
    blockDefinitions?: BlockMetadata[] | undefined;
    blocks: string[];
  },
>(value: Value): boolean {
  if (value.blockDefinitions === undefined) return true;
  if (value.blockDefinitions.length !== value.blocks.length) return false;
  return value.blockDefinitions.every(
    (definition, index) => definition.type === value.blocks[index],
  );
}

/** Validated, executable-value-free metadata used to render browser form fields. */
export const fieldMetadataSchema = v.custom<FieldMetadata>(isFieldMetadata);
export const fieldMetadataMapSchema = v.custom<FieldMetadataMapDto>(isFieldMetadataMap);
/** Validated executable-value-free metadata used to render generic block forms. */
export const blockMetadataSchema = v.custom<BlockMetadata>(isBlockMetadata);

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

export const publicationOutcomeSchema = v.picklist(["published", "replayed"]);
export const buildDispatchOutcomeSchema = v.variant("status", [
  v.strictObject({ buildId: v.optional(identifierSchema), status: v.literal("accepted") }),
  v.strictObject({ status: v.literal("not-dispatched") }),
  v.strictObject({ status: v.literal("rejected") }),
  v.strictObject({ status: v.literal("unavailable") }),
]);
export const publishContentEntryResultSchema = v.strictObject({
  build: buildDispatchOutcomeSchema,
  entry: contentEntrySchema,
  publication: publicationOutcomeSchema,
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

export const contentModelSchema = v.pipe(
  v.strictObject({
    blockDefinitions: v.optional(v.array(blockMetadataSchema)),
    blocks: v.array(identifierSchema),
    description: v.optional(v.string()),
    fields: fieldMetadataMapSchema,
    key: identifierSchema,
    kind: v.picklist(["collection", "page"]),
    label: v.optional(v.string()),
    path: v.optional(v.string()),
    route: v.optional(v.string()),
    version: v.pipe(v.number(), v.integer(), v.minValue(1)),
  }),
  v.check(hasMatchingBlockDefinitions, "Block definitions must match the model's allowed blocks."),
);
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

const roleSchema = v.picklist(["admin", "editor", "viewer"]);
const emailSchema = v.pipe(v.string(), v.email(), v.maxLength(320));
const passwordSchema = v.pipe(v.string(), v.minLength(12), v.maxLength(1_024));
export const setupAdminRequestSchema = v.strictObject({
  email: emailSchema,
  password: passwordSchema,
  token: v.pipe(v.string(), v.minLength(40), v.maxLength(128)),
});
export const userCreateRequestSchema = v.strictObject({
  email: emailSchema,
  password: passwordSchema,
  role: roleSchema,
});
export const userUpdateRequestSchema = v.strictObject({
  disabled: v.optional(v.boolean()),
  role: v.optional(roleSchema),
});
export const managedUserSchema = v.strictObject({
  disabled: v.boolean(),
  email: emailSchema,
  id: identifierSchema,
  role: roleSchema,
});
export const managedUserListSchema = v.strictObject({ items: v.array(managedUserSchema) });
export const adminSettingsStatusSchema = v.strictObject({
  configuredModels: nonNegativeIntegerSchema,
  ready: v.boolean(),
});
export type AdminSettingsStatusDto = v.InferOutput<typeof adminSettingsStatusSchema>;
export type ManagedUserDto = v.InferOutput<typeof managedUserSchema>;
export type ManagedUserListDto = v.InferOutput<typeof managedUserListSchema>;
export const buildTokenCreateRequestSchema = v.strictObject({
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(120)),
});
export const buildTokenSchema = v.strictObject({
  capabilities: v.tuple([v.literal("content:build:read")]),
  createdAt: isoTimestampSchema,
  id: identifierSchema,
  lastUsedAt: v.optional(isoTimestampSchema),
  name: v.string(),
  revokedAt: v.optional(isoTimestampSchema),
  tokenPrefix: v.string(),
});
export const buildTokenCreatedSchema = v.strictObject({
  ...buildTokenSchema.entries,
  token: v.string(),
});
export const buildTokenListSchema = v.strictObject({ items: v.array(buildTokenSchema) });
export type BuildTokenDto = v.InferOutput<typeof buildTokenSchema>;
export type BuildTokenCreatedDto = v.InferOutput<typeof buildTokenCreatedSchema>;
export type BuildTokenListDto = v.InferOutput<typeof buildTokenListSchema>;

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
export const mediaListSchema = cursorPageSchema(mediaMetadataSchema);

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
  "LAST_ADMIN_PROTECTED",
  "INTERNAL_ERROR",
  "NOT_FOUND",
  "PAYLOAD_TOO_LARGE",
  "RATE_LIMITED",
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
export type PublishContentEntryResultDto = v.InferOutput<typeof publishContentEntryResultSchema>;
export type ContentEntryListDto = v.InferOutput<typeof contentEntryListSchema>;
export type ContentEntrySummaryDto = v.InferOutput<typeof contentEntrySummarySchema>;
export type ContentModelDto = v.InferOutput<typeof contentModelSchema>;
export type ContentModelListDto = v.InferOutput<typeof contentModelListSchema>;
export type ContentSnapshotDto = v.InferOutput<typeof contentSnapshotSchema>;
export type ContentBlockDto = v.InferOutput<typeof contentBlockSchema>;
export type PublicContentEntryDto = v.InferOutput<typeof publicContentEntrySchema>;
export type PublicContentListDto = v.InferOutput<typeof publicContentListSchema>;
export type BuildExportDto = v.InferOutput<typeof buildExportSchema>;
export type MediaMetadataDto = v.InferOutput<typeof mediaMetadataSchema>;
export type MediaListDto = v.InferOutput<typeof mediaListSchema>;
export type SiteBuildDto = v.InferOutput<typeof siteBuildSchema>;
export type ErrorEnvelope = v.InferOutput<typeof errorEnvelopeSchema>;
export type LaceErrorCode = v.InferOutput<typeof errorCodeSchema>;
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

/** Maps the portable publication command outcome without exposing application internals. */
export function toPublishContentEntryResultDto(input: {
  readonly build:
    | Readonly<{ readonly buildId?: string; readonly status: "accepted" }>
    | Readonly<{ readonly status: "not-dispatched" | "rejected" | "unavailable" }>;
  readonly entry: ContentEntry;
  readonly publication: "published" | "replayed";
}): PublishContentEntryResultDto {
  return {
    build:
      input.build.status === "accepted"
        ? {
            ...(input.build.buildId === undefined ? {} : { buildId: input.build.buildId }),
            status: "accepted",
          }
        : { status: input.build.status },
    entry: toContentEntryDto(input.entry),
    publication: input.publication,
  };
}

/** Maps metadata without exposing the private storage key. */
export interface MediaMetadataDtoSource {
  readonly createdAt: UnixMilliseconds;
  readonly createdBy: string;
  readonly filename: string;
  readonly height?: number;
  readonly id: string;
  readonly mimeType: string;
  readonly size: number;
  readonly status: "active" | "delete_failed" | "deleting";
  readonly updatedAt: UnixMilliseconds;
  readonly width?: number;
}

export function toMediaMetadataDto(media: MediaMetadataDtoSource, url: string): MediaMetadataDto {
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

/** Produces the stable Lace media URL from configured public origin data only. */
export function mediaUrl(baseUrl: string, mediaId: string): string {
  if (!/^https?:\/\/[^\s]+\/$/u.test(baseUrl)) {
    throw new TypeError("Media base URL must be an absolute HTTP(S) URL ending in a slash.");
  }
  return `${baseUrl}api/v1/public/media/${encodeURIComponent(mediaId)}`;
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
  readonly blockDefinitions?: readonly BlockMetadata[];
  readonly blocks: readonly string[];
  readonly description?: string;
  readonly fields: FieldMetadataMapDto;
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
    ...(model.blockDefinitions === undefined
      ? {}
      : { blockDefinitions: [...model.blockDefinitions] }),
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
  LAST_ADMIN_PROTECTED: 409,
};

const domainErrorMessage: Readonly<Record<DomainErrorCode, string>> = {
  AUTHORIZATION_DENIED: "The actor is not permitted to perform this operation.",
  CONTENT_INVALID_STATE: "The requested content operation is invalid.",
  CONTENT_MODEL_CARDINALITY_CONFLICT: "The content model cannot accept another entry.",
  CONTENT_PUBLISHED_IMMUTABLE: "Published content cannot be modified.",
  CONTENT_REVISION_CONFLICT: "The draft was modified by another request.",
  CONTENT_ROUTE_CONFLICT: "The public route is already in use.",
  LAST_ADMIN_PROTECTED: "The final active administrator cannot be disabled or demoted.",
};

export interface ClassifiedError {
  readonly body: ErrorEnvelope;
  readonly status: 403 | 404 | 409 | 413 | 422 | 429 | 500;
}

export type TransportErrorCode =
  | "AUTHORIZATION_DENIED"
  | "NOT_FOUND"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMITED";

const transportErrorStatus: Readonly<Record<TransportErrorCode, 403 | 404 | 413 | 429>> = {
  AUTHORIZATION_DENIED: 403,
  NOT_FOUND: 404,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
};

const transportErrorMessage: Readonly<Record<TransportErrorCode, string>> = {
  AUTHORIZATION_DENIED: "The actor is not permitted to perform this operation.",
  NOT_FOUND: "The requested resource was not found.",
  PAYLOAD_TOO_LARGE: "The request body is too large.",
  RATE_LIMITED: "Too many requests were received.",
};

/** Creates one of the stable sanitized envelopes for HTTP boundary failures. */
export function transportError(code: TransportErrorCode): ClassifiedError {
  return {
    body: { error: { code, message: transportErrorMessage[code] } },
    status: transportErrorStatus[code],
  };
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
