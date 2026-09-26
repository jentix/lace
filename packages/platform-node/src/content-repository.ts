import {
  actorDisplayName,
  ALLOWED_MEDIA_MIME_TYPES,
  DISPATCHER_LEASE_DURATION_MS,
  dispatcherEventId,
  foldAscii,
  MAX_CONTENT_ENTRY_SEARCH_LENGTH,
  MAX_MEDIA_USAGE_ENTRIES,
  dispatcherLeaseId,
  opaqueCursor,
  planConfigurationSynchronization,
  renderConfigurationSyncPlanJson,
} from "@lacecms/application";
import type {
  ActorSummary,
  ApplyConfigurationSynchronizationInput,
  ApplyConfigurationSynchronizationResult,
  BuildContentExport,
  ClaimDispatcherEventsInput,
  CompleteDispatcherLeaseInput,
  ContentCommandResult,
  ContentEntryCommandPort,
  ContentEntryListPage,
  ContentEntryListValues,
  ContentEntryReadPort,
  ContentEntrySort,
  ContentEntryStatus,
  ContentEntryStatusTotals,
  ContentEntrySummary,
  ConfigurationSyncApplyPort,
  ConfigurationSyncStateReadPort,
  CreateContentEntryInput,
  CreateMediaMetadataInput,
  CursorPage,
  DispatcherLease,
  DispatcherLeasePort,
  ListContentEntriesInput,
  ListMediaInput,
  LoadMediaUsageInput,
  MediaCatalogItem,
  MediaCatalogPort,
  ListPublicContentInput,
  LoadContentEntryInput,
  MarkMediaForDeletionInput,
  MarkMediaForDeletionResult,
  MediaCommandPort,
  MediaDeletionDispatchPort,
  MediaListPort,
  MediaReadPort,
  MediaSort,
  MediaUsageEntry,
  MediaUsageLocation,
  MediaUsageState,
  PublishContentEntryCommand,
  PublishContentEntryResult,
  PublicContentEntry,
  PublicContentReadPort,
  SaveCompleteDraftInput,
  RetryDispatcherLeaseInput,
  StoredContentModelState,
} from "@lacecms/application";
import {
  DomainError,
  actorId,
  blockKey,
  contentEntryId,
  contentModelKey,
  contentSnapshotId,
  resolveContentPublicPath,
  unixMilliseconds,
} from "@lacecms/domain";
import type {
  Actor,
  ActorId,
  ContentBlock,
  ContentEntry,
  ContentModelRoute,
  DraftSnapshot,
  MediaMetadata,
  PublishedSnapshot,
  Role,
} from "@lacecms/domain";
import type { JsonObject } from "@lacecms/content";
import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import type { NodeDatabase } from "./index.js";

const CURSOR_VERSION = 1;
const MAX_PAGE_SIZE = 100;
const SQLITE_BIND_CHUNK = 200;

type CursorKind = string;

interface DecodedCursor {
  readonly id: string;
  readonly timestamp: number;
}

interface EntryRow {
  readonly draft_snapshot_id: string | null;
  readonly id: string;
  readonly model_key: string;
  readonly published_snapshot_id: string | null;
}

interface OutboxRow {
  readonly attempts: number;
  readonly available_at: number;
  readonly id: string;
  readonly payload_json: string;
  readonly type: string;
}

interface SnapshotRow {
  readonly created_at: number;
  readonly entry_id: string;
  readonly fields_json: string;
  readonly id: string;
  readonly revision: number;
  readonly role: string | null;
  readonly schema_version: number;
  readonly slug: string | null;
  readonly title: string;
  readonly updated_at: number;
  readonly updated_by: string;
}

interface BlockRow {
  readonly block_key: string;
  readonly block_type: string;
  readonly created_at: number;
  readonly data_json: string;
  readonly position: number;
  readonly schema_version: number;
  readonly snapshot_id: string;
  readonly updated_at: number;
}

interface StoredSnapshot {
  readonly blocks: readonly ContentBlock[];
  readonly createdAt: number;
  readonly entryId: string;
  readonly fields: JsonObject;
  readonly id: string;
  readonly revision: number;
  readonly slug?: string;
  readonly title: string;
  readonly updatedAt: number;
  readonly updatedBy: Actor;
}

interface SummaryRow {
  readonly draft_revision: number;
  readonly fields_json: string;
  readonly id: string;
  readonly model_key: string;
  readonly published_at: number | null;
  readonly published_snapshot_id: string | null;
  readonly slug: string | null;
  readonly sort_value: number | string;
  readonly status: string;
  readonly title: string;
  readonly updated_at: number;
  readonly updated_by: string;
  readonly updated_by_name: string | null;
}

interface TotalsRow {
  readonly changed_count: number | null;
  readonly draft_count: number | null;
  readonly published_count: number | null;
  readonly total_count: number;
}

interface DecodedEntryCursor {
  readonly id: string;
  readonly value: number | string;
}

const SORT_CURSOR_VERSION = 2;
const ENTRY_SOURCE_SQL = `content_entries e
  join content_snapshots d on d.id = e.draft_snapshot_id
  left join content_snapshots p on p.id = e.published_snapshot_id`;
const ENTRY_STATUS_SQL = `case when e.published_snapshot_id is null then 'draft'
  when p.revision = d.revision then 'published' else 'changed' end`;
const ENTRY_SEARCH_SQL = "(instr(lower(d.title), ?) > 0 or instr(coalesce(d.slug, ''), ?) > 0)";
const ENTRY_SORT_SQL: Readonly<Record<string, { readonly order: string; readonly value: string }>> =
  {
    publishedAt: { order: "coalesce(p.created_at, -1)", value: "coalesce(p.created_at, -1)" },
    title: { order: "d.title collate nocase", value: "d.title" },
    updatedAt: { order: "e.updated_at", value: "e.updated_at" },
  };
const MAX_MEDIA_FILENAME_LENGTH = 255;
const MEDIA_COLUMNS_SQL =
  "m.id, m.storage_key, m.filename, m.mime_type, m.size, m.width, m.height, m.status, m.created_by, m.created_at, m.updated_at";
/** Distinct entries whose current draft or published snapshot references the media row `m`. */
const MEDIA_USAGE_COUNT_SQL = `(select count(distinct s.entry_id)
  from content_media_references r
  join content_snapshots s on s.id = r.snapshot_id
  where r.media_id = m.id)`;
const MEDIA_CATALOG_SQL = `select ${MEDIA_COLUMNS_SQL}, u.name as created_by_name,
  ${MEDIA_USAGE_COUNT_SQL} as usage_count`;
const MEDIA_SORT_SQL: Readonly<Record<string, { readonly order: string; readonly value: string }>> =
  {
    createdAt: { order: "m.created_at", value: "m.created_at" },
    filename: { order: "m.filename collate nocase", value: "m.filename" },
    size: { order: "m.size", value: "m.size" },
  };

interface MediaUsageRow {
  readonly block_type: string | null;
  readonly entry_id: string;
  readonly field_path: string;
  readonly model_key: string;
  readonly position: number | null;
  readonly slug: string | null;
  readonly source_key: string;
  readonly state: MediaUsageState;
  readonly status: string;
  readonly title: string;
}

interface MediaUsageLocationDraft {
  readonly blockKey?: string;
  blockType?: string;
  readonly field: string;
  position: number;
  readonly states: Set<MediaUsageState>;
}

interface PublicRow extends EntryRow {
  readonly path: string;
  readonly published_created_at: number;
}

interface StoredModelStateRow {
  readonly draft_snapshot_count: number;
  readonly entry_count: number;
  readonly key: string;
  readonly kind: string;
  readonly projection_hash: string;
  readonly published_snapshot_count: number;
  readonly structure_hash: string;
  readonly version: number;
}

function sameStoredModelStates(
  expected: readonly StoredContentModelState[],
  actual: readonly StoredContentModelState[],
): boolean {
  if (expected.length !== actual.length) return false;
  return expected.every((value, index) => {
    const candidate = actual[index];
    return (
      candidate !== undefined &&
      value.key === candidate.key &&
      value.kind === candidate.kind &&
      value.version === candidate.version &&
      value.structureHash === candidate.structureHash &&
      value.projectionHash === candidate.projectionHash &&
      value.entryCount === candidate.entryCount &&
      value.draftSnapshotCount === candidate.draftSnapshotCount &&
      value.publishedSnapshotCount === candidate.publishedSnapshotCount
    );
  });
}

function failure(message: string): never {
  throw new DomainError("CONTENT_INVALID_STATE", message);
}

function assertPageSize(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_PAGE_SIZE) {
    failure(`Page limit must be a positive integer no greater than ${MAX_PAGE_SIZE}.`);
  }
  return value;
}

function assertNonNegativeInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    failure(`${label} is invalid.`);
  }
  return value;
}

function sanitizeDispatchError(value: string): string {
  return (
    value
      .replace(/[\r\n\t]/gu, " ")
      .replace(/\s+/gu, " ")
      .trim()
      .slice(0, 160) || "storage_unavailable"
  );
}

function parseObject(value: string, label: string): JsonObject {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed === null || Array.isArray(parsed) || typeof parsed !== "object") {
      failure(`${label} must contain a JSON object.`);
    }
    return parsed as JsonObject;
  } catch (error) {
    if (error instanceof DomainError) throw error;
    failure(`${label} contains invalid JSON.`);
  }
}

function role(value: string | null): Role {
  return value === "admin" || value === "editor" || value === "viewer" ? value : "viewer";
}

function assertTimestamp(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0)
    failure(`${label} must be a UTC millisecond value.`);
  return value;
}

function encodeCursor(
  kind: CursorKind,
  timestamp: number,
  id: string,
): ReturnType<typeof opaqueCursor> {
  return opaqueCursor(
    Buffer.from(JSON.stringify({ id, kind, timestamp, version: CURSOR_VERSION })).toString(
      "base64url",
    ),
  );
}

function decodeCursor(value: string, kind: CursorKind): DecodedCursor {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) failure("Cursor is not base64url encoded.");
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      Object.keys(parsed).length !== 4
    ) {
      failure("Cursor has an invalid shape.");
    }
    const candidate = parsed as Record<string, unknown>;
    if (
      candidate.version !== CURSOR_VERSION ||
      candidate.kind !== kind ||
      typeof candidate.id !== "string" ||
      candidate.id.length === 0 ||
      typeof candidate.timestamp !== "number"
    ) {
      failure("Cursor is unsupported or belongs to a different list.");
    }
    return {
      id: candidate.id,
      timestamp: assertTimestamp(candidate.timestamp, "Cursor timestamp"),
    };
  } catch (error) {
    if (error instanceof DomainError) throw error;
    failure("Cursor contains invalid JSON.");
  }
}

function entryCursorKind(input: ListContentEntriesInput): string {
  return JSON.stringify([
    "entries",
    input.modelKey,
    input.sort,
    input.status ?? null,
    input.q ?? null,
  ]);
}

function encodeSortCursor(
  kind: string,
  value: number | string,
  id: string,
): ReturnType<typeof opaqueCursor> {
  return opaqueCursor(
    Buffer.from(JSON.stringify({ id, kind, value, version: SORT_CURSOR_VERSION })).toString(
      "base64url",
    ),
  );
}

function decodeSortCursor(
  value: string,
  kind: string,
  validValue: (sortValue: unknown) => boolean,
): DecodedEntryCursor {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) failure("Cursor is not base64url encoded.");
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      Object.keys(parsed).length !== 4
    ) {
      failure("Cursor has an invalid shape.");
    }
    const candidate = parsed as Record<string, unknown>;
    if (
      candidate.version !== SORT_CURSOR_VERSION ||
      candidate.kind !== kind ||
      typeof candidate.id !== "string" ||
      candidate.id.length === 0
    ) {
      failure("Cursor is unsupported or belongs to a different list.");
    }
    if (!validValue(candidate.value)) failure("Cursor sort value is invalid.");
    return { id: candidate.id, value: candidate.value as number | string };
  } catch (error) {
    if (error instanceof DomainError) throw error;
    failure("Cursor contains invalid JSON.");
  }
}

function decodeEntryCursor(
  value: string,
  kind: string,
  sort: ContentEntrySort,
): DecodedEntryCursor {
  return decodeSortCursor(value, kind, (sortValue) =>
    sort.endsWith("title")
      ? typeof sortValue === "string" && sortValue.length <= MAX_CONTENT_ENTRY_SEARCH_LENGTH
      : typeof sortValue === "number" && Number.isSafeInteger(sortValue) && sortValue >= -1,
  );
}

function mediaCursorKind(input: ListMediaInput): string {
  return JSON.stringify(["media", input.sort, input.type ?? null, input.q ?? null]);
}

function decodeMediaCursor(value: string, kind: string, sort: MediaSort): DecodedEntryCursor {
  return decodeSortCursor(value, kind, (sortValue) =>
    sort.endsWith("filename")
      ? typeof sortValue === "string" && sortValue.length <= MAX_MEDIA_FILENAME_LENGTH
      : typeof sortValue === "number" && Number.isSafeInteger(sortValue) && sortValue >= 0,
  );
}

/** Orders usage locations: entry fields by name, then blocks by position and key. */
function compareUsageLocations(
  left: MediaUsageLocationDraft,
  right: MediaUsageLocationDraft,
): number {
  if ((left.blockKey === undefined) !== (right.blockKey === undefined)) {
    return left.blockKey === undefined ? -1 : 1;
  }
  if (left.position !== right.position) return left.position - right.position;
  const leftKey = `${left.blockKey ?? ""}\u0000${left.field}`;
  const rightKey = `${right.blockKey ?? ""}\u0000${right.field}`;
  return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
}

function usageStates(states: ReadonlySet<MediaUsageState>): readonly MediaUsageState[] {
  return Object.freeze((["draft", "published"] as const).filter((state) => states.has(state)));
}

function entryStatus(value: string): ContentEntryStatus {
  if (value === "changed" || value === "draft" || value === "published") return value;
  failure("Entry status is invalid.");
}

function listValues(fieldsJson: string, listFields: readonly string[]): ContentEntryListValues {
  const values: Record<string, boolean | number | string> = {};
  if (listFields.length === 0) return Object.freeze(values);
  const fields = parseObject(fieldsJson, "Snapshot fields");
  for (const key of listFields) {
    const value = Object.hasOwn(fields, key) ? fields[key] : undefined;
    if (
      typeof value === "string" ||
      typeof value === "boolean" ||
      (typeof value === "number" && Number.isFinite(value))
    ) {
      values[key] = value;
    }
  }
  return Object.freeze(values);
}

function chunks<Value>(values: readonly Value[]): readonly (readonly Value[])[] {
  const result: Value[][] = [];
  for (let index = 0; index < values.length; index += SQLITE_BIND_CHUNK) {
    result.push(values.slice(index, index + SQLITE_BIND_CHUNK));
  }
  return result;
}

/** Maps the current runtime configuration to a persisted content-model identity. */
export type ContentModelResolver = (key: string) => ContentModelRoute | undefined;

export interface NodeRepositoryOptions {
  readonly beforeMutation?: (checkpoint: string) => void;
  readonly nextId?: () => string;
}

/**
 * Node SQLite implementation of bounded content reads plus draft creation and
 * replacement. Guarded publication and deletion intentionally belong to 5C.
 */
export class NodeContentRepository
  implements
    ContentEntryCommandPort,
    ContentEntryReadPort,
    ConfigurationSyncApplyPort,
    ConfigurationSyncStateReadPort,
    DispatcherLeasePort,
    MediaCommandPort,
    MediaCatalogPort,
    MediaDeletionDispatchPort,
    MediaListPort,
    MediaReadPort,
    PublicContentReadPort
{
  public constructor(
    private readonly connection: Database.Database,
    private readonly resolveModel: ContentModelResolver,
    private readonly options: NodeRepositoryOptions = {},
  ) {}

  public async readConfigurationSyncState(): Promise<readonly StoredContentModelState[]> {
    return this.readConfigurationSyncStateNow();
  }

  public async applyConfigurationSynchronization(
    input: ApplyConfigurationSynchronizationInput,
  ): Promise<ApplyConfigurationSynchronizationResult> {
    try {
      return this.connection.transaction(() => {
        const current = this.readConfigurationSyncStateNow();
        const actualPlan = planConfigurationSynchronization({
          models: input.models,
          storedModels: current,
        });
        if (
          !input.plan.isValid ||
          !sameStoredModelStates(input.expectedStoredModels, current) ||
          renderConfigurationSyncPlanJson(input.plan) !==
            renderConfigurationSyncPlanJson(actualPlan)
        ) {
          failure("Configuration synchronization plan is stale.");
        }
        if (!actualPlan.requiresApply) {
          return Object.freeze({ operations: Object.freeze([]), status: "noop" as const });
        }

        const expectedByKey = new Map(
          input.expectedStoredModels.map((model) => [model.key, model]),
        );
        const configurationByKey = new Map(input.models.map((model) => [model.key, model]));
        const pageEntries = new Map(input.pageEntries.map((page) => [page.modelKey, page]));
        for (const operation of actualPlan.operations) {
          if (operation.action === "create") {
            const configuration = configurationByKey.get(operation.model.key);
            if (configuration === undefined) failure("Synchronization model is unavailable.");
            this.checkpoint("sync.model.create");
            this.connection
              .prepare(
                "insert into content_models (key, kind, label, config_version, structure_hash, projection_hash, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?)",
              )
              .run(
                operation.model.key,
                operation.model.kind,
                configuration.label ?? configuration.key,
                operation.model.version,
                operation.model.structureHash,
                operation.model.projectionHash,
                input.appliedAt,
                input.appliedAt,
              );
            if (configuration.kind === "page") {
              const page = pageEntries.get(operation.model.key);
              if (page === undefined || page.entry.model.key !== operation.model.key) {
                failure("Page synchronization entry is missing or invalid.");
              }
              this.checkpoint("sync.page.entry");
              this.connection
                .prepare(
                  "insert into content_entries (id, model_key, singleton_key, created_by, created_at, updated_at) values (?, ?, 1, ?, ?, ?)",
                )
                .run(
                  page.entry.id,
                  operation.model.key,
                  page.entry.draft.updatedBy.id,
                  page.entry.draft.createdAt,
                  page.entry.draft.updatedAt,
                );
              this.checkpoint("sync.page.snapshot");
              this.insertSnapshot(page.entry.draft, operation.model.version);
              this.insertBlocks(page.entry.draft);
              this.connection
                .prepare("update content_entries set draft_snapshot_id = ? where id = ?")
                .run(page.entry.draft.id, page.entry.id);
            }
            continue;
          }
          if (operation.action === "remove") {
            const expected = expectedByKey.get(operation.model.key);
            if (expected === undefined) failure("Synchronization removal guard is missing.");
            this.checkpoint("sync.model.remove");
            const removed = this.connection
              .prepare(
                "delete from content_models where key = ? and kind = ? and config_version = ? and structure_hash = ? and projection_hash = ?",
              )
              .run(
                expected.key,
                expected.kind,
                expected.version,
                expected.structureHash,
                expected.projectionHash,
              );
            if (removed.changes !== 1) failure("Configuration synchronization plan is stale.");
            continue;
          }
          if (
            operation.action === "blocked-removal" ||
            operation.action === "incompatible-change"
          ) {
            failure("Configuration synchronization plan contains an unsafe operation.");
          }
          const configuration = configurationByKey.get(operation.model.key);
          if (configuration === undefined) failure("Synchronization model is unavailable.");
          const previousKey =
            operation.action === "rename" ? operation.renamedFrom : operation.model.key;
          const expected = expectedByKey.get(previousKey);
          if (expected === undefined) failure("Synchronization update guard is missing.");
          this.checkpoint(`sync.model.${operation.action}`);
          const updated = this.connection
            .prepare(
              "update content_models set key = ?, kind = ?, label = ?, config_version = ?, structure_hash = ?, projection_hash = ?, updated_at = ? where key = ? and kind = ? and config_version = ? and structure_hash = ? and projection_hash = ?",
            )
            .run(
              operation.model.key,
              operation.model.kind,
              configuration.label ?? configuration.key,
              operation.model.version,
              operation.model.structureHash,
              operation.model.projectionHash,
              input.appliedAt,
              expected.key,
              expected.kind,
              expected.version,
              expected.structureHash,
              expected.projectionHash,
            );
          if (updated.changes !== 1) failure("Configuration synchronization plan is stale.");
        }
        const targetVersion = this.bumpPublicState(input.appliedAt, "system:content-sync", null);
        return Object.freeze({
          operations: actualPlan.operations,
          status: "applied" as const,
          targetVersion,
        });
      })();
    } catch (error) {
      this.throwWriteError(error, true);
    }
  }

  public async create(input: CreateContentEntryInput): Promise<ContentCommandResult> {
    const { draft, id, model } = input.entry;
    try {
      this.connection.transaction(() => {
        const version = this.connection
          .prepare("select config_version from content_models where key = ?")
          .get(model.key) as { readonly config_version: number } | undefined;
        if (version === undefined) failure(`Content model ${model.key} does not exist.`);
        this.connection
          .prepare(
            "insert into content_entries (id, model_key, singleton_key, created_by, created_at, updated_at) values (?, ?, ?, ?, ?, ?)",
          )
          .run(
            id,
            model.key,
            model.kind === "page" ? 1 : null,
            draft.updatedBy.id,
            draft.createdAt,
            draft.updatedAt,
          );
        this.insertSnapshot(draft, version.config_version);
        this.insertBlocks(draft);
        this.insertReferences(draft.id, input.mediaReferences, draft.updatedAt);
        this.connection
          .prepare("update content_entries set draft_snapshot_id = ? where id = ?")
          .run(draft.id, id);
      })();
    } catch (error) {
      this.throwWriteError(error, model.kind === "page");
    }
    const entry = this.loadEntry(id);
    if (entry === null) failure("Created content entry could not be reloaded.");
    return { entry, status: "created" };
  }

  public async saveCompleteDraft(input: SaveCompleteDraftInput): Promise<ContentCommandResult> {
    const existing = this.entryRow(input.entryId);
    if (existing === undefined || existing.draft_snapshot_id === null) {
      failure("Content entry does not have a mutable draft.");
    }
    const draftSnapshotId = existing.draft_snapshot_id;
    try {
      this.connection.transaction(() => {
        const changed = this.connection
          .prepare(
            "update content_snapshots set revision = revision + 1, slug = ?, title = ?, fields_json = ?, updated_at = ?, updated_by = ? where id = ? and revision = ?",
          )
          .run(
            input.mutation.slug ?? null,
            input.mutation.title,
            JSON.stringify(input.mutation.fields),
            input.mutation.updatedAt,
            input.mutation.updatedBy.id,
            draftSnapshotId,
            input.mutation.expectedRevision,
          );
        if (changed.changes !== 1) {
          throw new DomainError(
            "CONTENT_REVISION_CONFLICT",
            "The draft revision no longer matches the expected revision.",
          );
        }
        this.connection
          .prepare("delete from content_blocks where snapshot_id = ?")
          .run(draftSnapshotId);
        this.connection
          .prepare("delete from content_media_references where snapshot_id = ?")
          .run(draftSnapshotId);
        this.insertBlocks({ ...input.mutation, id: contentSnapshotId(draftSnapshotId) });
        this.insertReferences(
          draftSnapshotId,
          input.mutation.mediaReferences,
          input.mutation.updatedAt,
        );
        this.connection
          .prepare("update content_entries set updated_at = ? where id = ?")
          .run(input.mutation.updatedAt, input.entryId);
      })();
    } catch (error) {
      this.throwWriteError(error, false);
    }
    const entry = this.loadEntry(input.entryId);
    if (entry === null) failure("Saved content entry could not be reloaded.");
    return { entry, status: "saved" };
  }

  public async publish(input: PublishContentEntryCommand): Promise<PublishContentEntryResult> {
    const entry = this.loadEntry(input.entryId);
    if (entry === null) failure("Content entry does not exist.");
    const path = resolveContentPublicPath(entry.model, entry.draft.slug);
    const scope =
      input.idempotency === undefined
        ? undefined
        : `publication:${input.entryId}:${input.idempotency.actorId}`;
    try {
      const result = this.connection.transaction(() => {
        if (input.idempotency !== undefined) {
          if (input.idempotency.actorId !== input.publishedBy.id)
            failure("Publication idempotency actor must match publisher.");
          const prior = this.connection
            .prepare(
              "select request_hash, response_json from idempotency_records where scope = ? and key = ?",
            )
            .get(scope, input.idempotency.key) as
            | { request_hash: string; response_json: string }
            | undefined;
          if (prior !== undefined) {
            if (prior.request_hash !== input.idempotency.fingerprint)
              failure("Publication idempotency key was reused with different input.");
            return {
              entry: JSON.parse(prior.response_json) as ContentEntry,
              outcome: "replayed" as const,
              status: "published" as const,
            };
          }
        }
        this.checkpoint("publish.snapshot");
        const copied = this.connection
          .prepare(
            "insert into content_snapshots (id, entry_id, revision, slug, title, fields_json, schema_version, created_at, updated_at, updated_by) select ?, s.entry_id, s.revision, s.slug, s.title, s.fields_json, s.schema_version, ?, ?, ? from content_snapshots s join content_entries e on e.draft_snapshot_id = s.id where e.id = ? and s.revision = ?",
          )
          .run(
            input.publishedSnapshotId,
            input.publishedAt,
            input.publishedAt,
            input.publishedBy.id,
            input.entryId,
            input.expectedRevision,
          );
        if (copied.changes !== 1)
          throw new DomainError(
            "CONTENT_REVISION_CONFLICT",
            "The draft revision no longer matches the expected revision.",
          );
        this.checkpoint("publish.blocks");
        this.connection
          .prepare(
            "insert into content_blocks (snapshot_id, block_key, block_type, position, schema_version, data_json, created_at, updated_at) select ?, block_key, block_type, position, schema_version, data_json, created_at, updated_at from content_blocks where snapshot_id = ?",
          )
          .run(input.publishedSnapshotId, entry.draft.id);
        this.checkpoint("publish.references");
        this.connection
          .prepare(
            "insert into content_media_references (snapshot_id, source_key, field_path, media_id, created_at) select ?, source_key, field_path, media_id, created_at from content_media_references where snapshot_id = ?",
          )
          .run(input.publishedSnapshotId, entry.draft.id);
        this.checkpoint("publish.route");
        this.connection
          .prepare("delete from published_routes where entry_id = ?")
          .run(input.entryId);
        this.connection
          .prepare(
            "insert into published_routes (path, entry_id, snapshot_id, updated_at) values (?, ?, ?, ?)",
          )
          .run(path, input.entryId, input.publishedSnapshotId, input.publishedAt);
        this.connection
          .prepare(
            "update content_entries set published_snapshot_id = ?, updated_at = ? where id = ?",
          )
          .run(input.publishedSnapshotId, input.publishedAt, input.entryId);
        this.bumpPublicState(input.publishedAt, input.publishedBy.id, input.publishedSnapshotId);
        const committed = this.loadEntry(input.entryId);
        if (committed === null) failure("Published content entry could not be reloaded.");
        if (input.idempotency !== undefined)
          this.connection
            .prepare(
              "insert into idempotency_records (scope, key, request_hash, response_json, created_at, expires_at) values (?, ?, ?, ?, ?, ?)",
            )
            .run(
              scope,
              input.idempotency.key,
              input.idempotency.fingerprint,
              JSON.stringify(committed),
              input.publishedAt,
              input.publishedAt + 86_400_000,
            );
        if (entry.published !== undefined)
          this.connection
            .prepare("delete from content_snapshots where id = ?")
            .run(entry.published.id);
        return { entry: committed, outcome: "published" as const, status: "published" as const };
      })();
      return result;
    } catch (error) {
      this.throwWriteError(error, false);
    }
  }

  public async delete(
    input: import("@lacecms/application").DeleteContentEntryInput,
  ): Promise<ContentCommandResult> {
    try {
      this.connection.transaction(() => {
        const entry = this.entryRow(input.entryId);
        if (entry === undefined) failure("Content entry does not exist.");
        const expectedPublishedSnapshotId = input.expectedPublishedSnapshotId ?? null;
        if (entry.published_snapshot_id !== expectedPublishedSnapshotId) {
          throw new DomainError(
            "CONTENT_REVISION_CONFLICT",
            "The publication state no longer matches the deletion guard.",
          );
        }
        if (entry.published_snapshot_id !== null) {
          this.checkpoint("delete.route");
          this.connection
            .prepare("delete from published_routes where entry_id = ?")
            .run(input.entryId);
          this.bumpPublicState(input.deletedAt, input.deletedBy.id, entry.published_snapshot_id);
        }
        this.checkpoint("delete.entry");
        const deleted = this.connection
          .prepare(
            "delete from content_entries where id = ? and published_snapshot_id is ? and exists (select 1 from content_snapshots where id = content_entries.draft_snapshot_id and revision = ?)",
          )
          .run(input.entryId, expectedPublishedSnapshotId, input.expectedRevision);
        if (deleted.changes !== 1) {
          throw new DomainError(
            "CONTENT_REVISION_CONFLICT",
            "The draft revision no longer matches the deletion guard.",
          );
        }
      })();
    } catch (error) {
      this.throwWriteError(error, false);
    }
    return { status: "deleted" };
  }

  public async markForDeletion(
    input: MarkMediaForDeletionInput,
  ): Promise<MarkMediaForDeletionResult> {
    try {
      this.connection.transaction(() => {
        this.checkpoint("media.mark");
        const changed = this.connection
          .prepare(
            "update media set status = 'deleting', updated_at = ? where id = ? and status = 'active' and not exists (select 1 from content_media_references where media_id = ?)",
          )
          .run(input.requestedAt, input.mediaId, input.mediaId);
        if (changed.changes !== 1) {
          this.refuseDeletion(input.mediaId, "active", "Media is not eligible for deletion.");
        }
        this.checkpoint("media.outbox");
        this.connection
          .prepare(
            "insert into outbox_events (id, type, payload_json, attempts, available_at, created_at) values (?, 'media.delete.requested', ?, 0, ?, ?)",
          )
          .run(
            this.nextId(),
            JSON.stringify({ mediaId: input.mediaId, requestedBy: input.requestedBy.id }),
            input.requestedAt,
            input.requestedAt,
          );
      })();
    } catch (error) {
      this.throwWriteError(error, false);
    }
    const media = await this.loadMedia(input.mediaId);
    if (media === null) failure("Media deletion mark could not be reloaded.");
    return { media, status: "deleting" };
  }

  public async retryDeletion(
    input: MarkMediaForDeletionInput,
  ): Promise<MarkMediaForDeletionResult> {
    try {
      this.connection.transaction(() => {
        this.checkpoint("media.retry");
        const changed = this.connection
          .prepare(
            "update media set status = 'deleting', last_error = null, updated_at = ? where id = ? and status = 'delete_failed' and not exists (select 1 from content_media_references where media_id = ?)",
          )
          .run(input.requestedAt, input.mediaId, input.mediaId);
        if (changed.changes !== 1) {
          this.refuseDeletion(input.mediaId, "delete_failed", "Media deletion cannot be retried.");
        }
        this.checkpoint("media.outbox");
        this.connection
          .prepare(
            "insert into outbox_events (id, type, payload_json, attempts, available_at, created_at) values (?, 'media.delete.requested', ?, 0, ?, ?)",
          )
          .run(
            this.nextId(),
            JSON.stringify({ mediaId: input.mediaId, requestedBy: input.requestedBy.id }),
            input.requestedAt,
            input.requestedAt,
          );
      })();
    } catch (error) {
      this.throwWriteError(error, false);
    }
    const media = await this.loadMedia(input.mediaId);
    if (media === null) failure("Media deletion retry could not be reloaded.");
    return { media, status: "deleting" };
  }

  public async claim(input: ClaimDispatcherEventsInput): Promise<readonly DispatcherLease[]> {
    if (!Number.isSafeInteger(input.limit) || input.limit < 1 || input.limit > MAX_PAGE_SIZE) {
      failure("Dispatcher claim limit is invalid.");
    }
    if (input.eventTypes.length === 0 || input.eventTypes.some((type) => type.length === 0)) {
      failure("Dispatcher event types are invalid.");
    }
    const placeholders = input.eventTypes.map(() => "?").join(", ");
    const leases: DispatcherLease[] = [];
    try {
      this.connection.transaction(() => {
        const rows = this.connection
          .prepare(
            `select id, type, payload_json, attempts, available_at
               from outbox_events
              where processed_at is null
                and type in (${placeholders})
                and available_at <= ?
                and (locked_at is null or locked_at <= ?)
              order by available_at asc, id asc
              limit ?`,
          )
          .all(
            ...input.eventTypes,
            input.now,
            input.now - DISPATCHER_LEASE_DURATION_MS,
            input.limit,
          ) as readonly OutboxRow[];
        const claim = this.connection.prepare(
          "update outbox_events set locked_at = ?, locked_by = ? where id = ? and processed_at is null and (locked_at is null or locked_at <= ?)",
        );
        for (const row of rows) {
          const leaseId = dispatcherLeaseId(this.nextId());
          const claimed = claim.run(
            input.now,
            leaseId,
            row.id,
            input.now - DISPATCHER_LEASE_DURATION_MS,
          );
          if (claimed.changes !== 1) continue;
          leases.push(
            Object.freeze({
              event: Object.freeze({
                attempts: assertNonNegativeInteger(row.attempts, "Outbox attempts"),
                availableAt: unixMilliseconds(
                  assertTimestamp(row.available_at, "Outbox availability"),
                ),
                id: dispatcherEventId(row.id),
                payload: parseObject(row.payload_json, "Outbox payload"),
                type: row.type,
              }),
              expiresAt: unixMilliseconds(input.now + DISPATCHER_LEASE_DURATION_MS),
              id: leaseId,
            }),
          );
        }
      })();
    } catch (error) {
      this.throwWriteError(error, false);
    }
    return Object.freeze(leases);
  }

  public async complete(input: CompleteDispatcherLeaseInput): Promise<void> {
    try {
      const changed = this.connection
        .prepare(
          "update outbox_events set processed_at = ?, locked_at = null, locked_by = null where locked_by = ? and processed_at is null and locked_at > ?",
        )
        .run(input.completedAt, input.leaseId, input.completedAt - DISPATCHER_LEASE_DURATION_MS);
      if (changed.changes !== 1) failure("Dispatcher lease is missing or expired.");
    } catch (error) {
      this.throwWriteError(error, false);
    }
  }

  public async retry(input: RetryDispatcherLeaseInput): Promise<void> {
    try {
      const changed = this.connection
        .prepare(
          "update outbox_events set attempts = attempts + 1, available_at = ?, locked_at = null, locked_by = null, last_error = ? where locked_by = ? and processed_at is null and locked_at > ?",
        )
        .run(
          input.retryAt ?? input.failedAt,
          sanitizeDispatchError(input.error),
          input.leaseId,
          input.failedAt - DISPATCHER_LEASE_DURATION_MS,
        );
      if (changed.changes !== 1) failure("Dispatcher lease is missing or expired.");
    } catch (error) {
      this.throwWriteError(error, false);
    }
  }

  public async loadDeletingMedia(id: string): Promise<MediaMetadata | null> {
    const media = await this.loadMedia(id);
    return media?.status === "deleting" ? media : null;
  }

  public async completeMediaDeletion(input: {
    readonly completedAt: number;
    readonly leaseId: string;
    readonly mediaId: string;
  }): Promise<void> {
    try {
      this.connection.transaction(() => {
        const event = this.requireLeasedMediaDeletionEvent(
          input.leaseId,
          input.completedAt,
          input.mediaId,
        );
        const deleted = this.connection
          .prepare(
            "delete from media where id = ? and status = 'deleting' and not exists (select 1 from content_media_references where media_id = ?)",
          )
          .run(input.mediaId, input.mediaId);
        if (deleted.changes !== 1) failure("Media deletion can no longer be finalized.");
        const completed = this.connection
          .prepare(
            "update outbox_events set processed_at = ?, locked_at = null, locked_by = null where id = ? and locked_by = ?",
          )
          .run(input.completedAt, event.id, input.leaseId);
        if (completed.changes !== 1) failure("Dispatcher lease is missing or expired.");
      })();
    } catch (error) {
      this.throwWriteError(error, false);
    }
  }

  public async failMediaDeletion(input: {
    readonly failedAt: number;
    readonly leaseId: string;
    readonly mediaId: string;
    readonly sanitizedError: string;
    readonly terminal: boolean;
    readonly retryAt?: number;
  }): Promise<void> {
    const error = sanitizeDispatchError(input.sanitizedError);
    try {
      this.connection.transaction(() => {
        const event = this.requireLeasedMediaDeletionEvent(
          input.leaseId,
          input.failedAt,
          input.mediaId,
        );
        if (input.terminal) {
          const failed = this.connection
            .prepare(
              "update media set status = 'delete_failed', last_error = ?, updated_at = ? where id = ? and status = 'deleting'",
            )
            .run(error, input.failedAt, input.mediaId);
          if (failed.changes !== 1) failure("Media deletion can no longer be failed safely.");
          const completed = this.connection
            .prepare(
              "update outbox_events set attempts = attempts + 1, processed_at = ?, locked_at = null, locked_by = null, last_error = ? where id = ? and locked_by = ?",
            )
            .run(input.failedAt, error, event.id, input.leaseId);
          if (completed.changes !== 1) failure("Dispatcher lease is missing or expired.");
          return;
        }
        const retried = this.connection
          .prepare(
            "update outbox_events set attempts = attempts + 1, available_at = ?, locked_at = null, locked_by = null, last_error = ? where id = ? and locked_by = ?",
          )
          .run(input.retryAt ?? input.failedAt, error, event.id, input.leaseId);
        if (retried.changes !== 1) failure("Dispatcher lease is missing or expired.");
      })();
    } catch (error) {
      this.throwWriteError(error, false);
    }
  }

  public async createMedia(input: CreateMediaMetadataInput): Promise<MediaMetadata> {
    try {
      this.connection
        .prepare(
          "insert into media (id, storage_key, filename, mime_type, size, width, height, metadata_json, status, created_by, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, '{}', 'active', ?, ?, ?)",
        )
        .run(
          input.id,
          input.storageKey,
          input.filename,
          input.mimeType,
          input.size,
          input.width,
          input.height,
          input.createdBy,
          input.createdAt,
          input.createdAt,
        );
    } catch (error) {
      this.throwWriteError(error, false);
    }
    const media = await this.loadMedia(input.id);
    if (media === null) failure("Created media could not be reloaded.");
    return media;
  }

  public async load(input: LoadContentEntryInput): Promise<ContentEntry | null> {
    return this.loadEntry(input.entryId);
  }

  public async loadDraft(input: LoadContentEntryInput): Promise<DraftSnapshot | null> {
    return this.loadEntry(input.entryId)?.draft ?? null;
  }

  public async loadPublished(input: LoadContentEntryInput): Promise<PublishedSnapshot | null> {
    return this.loadEntry(input.entryId)?.published ?? null;
  }

  public async describeActors(ids: readonly ActorId[]): Promise<readonly ActorSummary[]> {
    const names = new Map<string, string>();
    for (const group of chunks([...new Set(ids)])) {
      const rows = this.connection
        .prepare(`select id, name from user where id in (${group.map(() => "?").join(", ")})`)
        .all(...group) as readonly { readonly id: string; readonly name: string }[];
      for (const row of rows) names.set(row.id, row.name);
    }
    return Object.freeze(
      ids.map((id) => Object.freeze({ displayName: actorDisplayName(id, names.get(id)), id })),
    );
  }

  public async list(input: ListContentEntriesInput): Promise<ContentEntryListPage> {
    const limit = assertPageSize(input.limit);
    const descending = input.sort.startsWith("-");
    const sort = ENTRY_SORT_SQL[descending ? input.sort.slice(1) : input.sort];
    if (sort === undefined) failure("Entry sort is unsupported.");
    if (input.status !== undefined) entryStatus(input.status);
    const kind = entryCursorKind(input);
    const after =
      input.after === undefined ? undefined : decodeEntryCursor(input.after, kind, input.sort);
    const term = input.q === undefined ? undefined : foldAscii(input.q);
    const searchBindings = term === undefined ? [] : [term, term];
    const searchClause = term === undefined ? "" : `and ${ENTRY_SEARCH_SQL}`;
    const comparison = descending ? "<" : ">";
    const direction = descending ? "desc" : "asc";
    const rows = this.connection
      .prepare(
        `select e.id, e.model_key, e.published_snapshot_id, e.updated_at,
                d.revision as draft_revision, d.title, d.slug, d.fields_json, d.updated_by,
                u.name as updated_by_name, p.created_at as published_at,
                ${ENTRY_STATUS_SQL} as status, ${sort.value} as sort_value
           from ${ENTRY_SOURCE_SQL}
           left join user u on u.id = d.updated_by
          where e.model_key = ? ${searchClause}
            ${input.status === undefined ? "" : `and ${ENTRY_STATUS_SQL} = ?`}
            ${
              after === undefined
                ? ""
                : `and (${sort.order} ${comparison} ? or (${sort.order} = ? and e.id ${comparison} ?))`
            }
          order by ${sort.order} ${direction}, e.id ${direction} limit ?`,
      )
      .all(
        input.modelKey,
        ...searchBindings,
        ...(input.status === undefined ? [] : [input.status]),
        ...(after === undefined ? [] : [after.value, after.value, after.id]),
        limit + 1,
      ) as readonly SummaryRow[];
    const pageRows = rows.slice(0, limit);
    const items = pageRows.map((row) => this.summary(row, input.listFields));
    const last = pageRows.at(-1);
    return Object.freeze({
      items: Object.freeze(items),
      ...(rows.length > limit && last !== undefined
        ? { nextCursor: encodeSortCursor(kind, last.sort_value, last.id) }
        : {}),
      totals: this.entryTotals(input.modelKey, term),
    });
  }

  private entryTotals(modelKey: string, term: string | undefined): ContentEntryStatusTotals {
    const row = this.connection
      .prepare(
        `select count(*) as total_count,
                sum(case when e.published_snapshot_id is null then 1 else 0 end) as draft_count,
                sum(case when p.revision = d.revision then 1 else 0 end) as published_count,
                sum(case when p.revision <> d.revision then 1 else 0 end) as changed_count
           from ${ENTRY_SOURCE_SQL}
          where e.model_key = ? ${term === undefined ? "" : `and ${ENTRY_SEARCH_SQL}`}`,
      )
      .get(modelKey, ...(term === undefined ? [] : [term, term])) as TotalsRow;
    return Object.freeze({
      all: assertNonNegativeInteger(row.total_count, "Entry total"),
      changed: assertNonNegativeInteger(row.changed_count ?? 0, "Changed entry total"),
      draft: assertNonNegativeInteger(row.draft_count ?? 0, "Draft entry total"),
      published: assertNonNegativeInteger(row.published_count ?? 0, "Published entry total"),
    });
  }

  private summary(row: SummaryRow, listFields: readonly string[]): ContentEntrySummary {
    const status = entryStatus(row.status);
    return Object.freeze({
      draftRevision: row.draft_revision,
      id: contentEntryId(row.id),
      listValues: listValues(row.fields_json, listFields),
      modelKey: contentModelKey(row.model_key),
      ...(row.published_snapshot_id === null || row.published_at === null
        ? {}
        : {
            publishedAt: unixMilliseconds(assertTimestamp(row.published_at, "Publication time")),
            publishedSnapshotId: contentSnapshotId(row.published_snapshot_id),
          }),
      ...(row.slug === null ? {} : { slug: row.slug }),
      status,
      title: row.title,
      updatedAt: unixMilliseconds(assertTimestamp(row.updated_at, "Entry timestamp")),
      updatedBy: Object.freeze({
        displayName: actorDisplayName(row.updated_by, row.updated_by_name),
        id: actorId(row.updated_by),
      }),
    });
  }

  public async listPublic(input: ListPublicContentInput): Promise<CursorPage<PublicContentEntry>> {
    const limit = assertPageSize(input.limit);
    const cursorKind = `public:${input.modelKey}`;
    const after = input.after === undefined ? undefined : decodeCursor(input.after, cursorKind);
    const rows = this.connection
      .prepare(
        `select e.id, e.model_key, e.draft_snapshot_id, e.published_snapshot_id,
                r.path, s.created_at as published_created_at
           from published_routes r
           join content_entries e on e.id = r.entry_id and e.published_snapshot_id = r.snapshot_id
           join content_snapshots s on s.id = r.snapshot_id
          where e.model_key = ?
            ${after === undefined ? "" : "and (s.created_at < ? or (s.created_at = ? and e.id < ?))"}
          order by s.created_at desc, e.id desc limit ?`,
      )
      .all(
        ...(after === undefined
          ? [input.modelKey, limit + 1]
          : [input.modelKey, after.timestamp, after.timestamp, after.id, limit + 1]),
      ) as readonly PublicRow[];
    const pageRows = rows.slice(0, limit);
    const entries = this.hydrate(pageRows);
    const items = pageRows.map((row) => {
      const entry = entries.get(row.id);
      if (entry === undefined) failure("Published route references an unreadable entry.");
      return Object.freeze({ entry: this.publicEntry(entry), path: row.path });
    });
    const last = pageRows.at(-1);
    return Object.freeze({
      items: Object.freeze(items),
      ...(rows.length > limit && last !== undefined
        ? { nextCursor: encodeCursor(cursorKind, last.published_created_at, last.id) }
        : {}),
    });
  }

  public async publishedContentVersion(): Promise<number> {
    const row = this.connection
      .prepare("select version from published_state where singleton_key = 1")
      .get() as { readonly version: number } | undefined;
    return row?.version ?? 0;
  }

  public async loadPublic(path: string): Promise<PublicContentEntry | null> {
    const row = this.connection
      .prepare(
        `select e.id, e.model_key, e.draft_snapshot_id, e.published_snapshot_id,
                r.path, s.created_at as published_created_at
           from published_routes r
           join content_entries e on e.id = r.entry_id and e.published_snapshot_id = r.snapshot_id
           join content_snapshots s on s.id = r.snapshot_id
          where r.path = ? limit 1`,
      )
      .get(path) as PublicRow | undefined;
    if (row === undefined) return null;
    const entry = this.hydrate([row]).get(row.id);
    return entry === undefined
      ? null
      : Object.freeze({ entry: this.publicEntry(entry), path: row.path });
  }

  public async loadPublicMedia(id: string): Promise<MediaMetadata | null> {
    const row = this.connection
      .prepare(
        `select m.id, m.storage_key, m.filename, m.mime_type, m.size, m.width, m.height,
                m.status, m.created_by, m.created_at, m.updated_at
           from media m
          where m.id = ? and exists (
            select 1 from content_media_references r
            join content_entries e on e.published_snapshot_id = r.snapshot_id
            where r.media_id = m.id
          ) limit 1`,
      )
      .get(id) as Record<string, unknown> | undefined;
    return row === undefined ? null : this.mapMedia(row);
  }

  public async loadMedia(id: string): Promise<MediaMetadata | null> {
    const row = this.connection
      .prepare(
        "select id, storage_key, filename, mime_type, size, width, height, status, created_by, created_at, updated_at from media where id = ? limit 1",
      )
      .get(id) as Record<string, unknown> | undefined;
    return row === undefined ? null : this.mapMedia(row);
  }

  public async listMedia(input: ListMediaInput): Promise<CursorPage<MediaCatalogItem>> {
    const limit = assertPageSize(input.limit);
    const descending = input.sort.startsWith("-");
    const sort = MEDIA_SORT_SQL[descending ? input.sort.slice(1) : input.sort];
    if (sort === undefined) failure("Media sort is unsupported.");
    if (input.type !== undefined && !ALLOWED_MEDIA_MIME_TYPES.includes(input.type)) {
      failure("Media type filter is unsupported.");
    }
    const kind = mediaCursorKind(input);
    const after =
      input.after === undefined ? undefined : decodeMediaCursor(input.after, kind, input.sort);
    const comparison = descending ? "<" : ">";
    const direction = descending ? "desc" : "asc";
    const conditions: string[] = [];
    const bindings: (number | string)[] = [];
    if (input.q !== undefined) {
      conditions.push("instr(lower(m.filename), ?) > 0");
      bindings.push(foldAscii(input.q));
    }
    if (input.type !== undefined) {
      conditions.push("m.mime_type = ?");
      bindings.push(input.type);
    }
    if (after !== undefined) {
      conditions.push(
        `(${sort.order} ${comparison} ? or (${sort.order} = ? and m.id ${comparison} ?))`,
      );
      bindings.push(after.value, after.value, after.id);
    }
    const rows = this.connection
      .prepare(
        `${MEDIA_CATALOG_SQL}, ${sort.value} as sort_value
           from media m
           left join user u on u.id = m.created_by
          ${conditions.length === 0 ? "" : `where ${conditions.join(" and ")}`}
          order by ${sort.order} ${direction}, m.id ${direction} limit ?`,
      )
      .all(...bindings, limit + 1) as readonly Record<string, unknown>[];
    const pageRows = rows.slice(0, limit);
    const items = pageRows.map((row) => this.catalogItem(row));
    const last = pageRows.at(-1);
    return Object.freeze({
      items: Object.freeze(items),
      ...(rows.length > limit && last !== undefined
        ? {
            nextCursor: encodeSortCursor(kind, last.sort_value as number | string, String(last.id)),
          }
        : {}),
    });
  }

  public async loadMediaCatalogItem(id: string): Promise<MediaCatalogItem | null> {
    const row = this.connection
      .prepare(
        `${MEDIA_CATALOG_SQL}
           from media m
           left join user u on u.id = m.created_by
          where m.id = ? limit 1`,
      )
      .get(id) as Record<string, unknown> | undefined;
    return row === undefined ? null : this.catalogItem(row);
  }

  public async loadMediaUsage(input: LoadMediaUsageInput): Promise<readonly MediaUsageEntry[]> {
    if (
      !Number.isSafeInteger(input.limit) ||
      input.limit < 1 ||
      input.limit > MAX_MEDIA_USAGE_ENTRIES
    ) {
      failure(`Media usage limit must be between 1 and ${MAX_MEDIA_USAGE_ENTRIES}.`);
    }
    const rows = this.connection
      .prepare(
        `with used as (
           select distinct s.entry_id
             from content_media_references r
             join content_snapshots s on s.id = r.snapshot_id
            where r.media_id = ?
         ), page as (
           select e.id
             from content_entries e
             join used on used.entry_id = e.id
            order by e.updated_at desc, e.id desc
            limit ?
         )
         select e.id as entry_id, e.model_key, d.title, d.slug,
                ${ENTRY_STATUS_SQL} as status,
                case when r.snapshot_id = e.draft_snapshot_id then 'draft' else 'published' end as state,
                r.source_key, r.field_path, b.block_type, b.position
           from content_media_references r
           join content_snapshots s on s.id = r.snapshot_id
           join content_entries e on e.id = s.entry_id
           join content_snapshots d on d.id = e.draft_snapshot_id
           left join content_snapshots p on p.id = e.published_snapshot_id
           left join content_blocks b on b.snapshot_id = r.snapshot_id and b.block_key = r.source_key
          where r.media_id = ? and e.id in (select id from page)
          order by e.updated_at desc, e.id desc`,
      )
      .all(input.mediaId, input.limit, input.mediaId) as readonly MediaUsageRow[];
    const entries = new Map<
      string,
      { readonly locations: Map<string, MediaUsageLocationDraft>; readonly row: MediaUsageRow }
    >();
    for (const row of rows) {
      let entry = entries.get(row.entry_id);
      if (entry === undefined) {
        entry = { locations: new Map(), row };
        entries.set(row.entry_id, entry);
      }
      const isBlock = row.source_key !== "$fields";
      if (isBlock && (row.block_type === null || row.position === null)) {
        throw new Error("A media reference names a block that does not exist.");
      }
      const key = `${row.source_key}\u0000${row.field_path}`;
      let location = entry.locations.get(key);
      if (location === undefined) {
        location = {
          ...(isBlock ? { blockKey: row.source_key, blockType: row.block_type! } : {}),
          field: row.field_path,
          position: isBlock ? row.position! : 0,
          states: new Set(),
        };
        entry.locations.set(key, location);
      } else if (isBlock) {
        // The draft's block type describes what an editor sees now.
        if (row.state === "draft") location.blockType = row.block_type!;
        location.position = Math.min(location.position, row.position!);
      }
      location.states.add(row.state);
    }
    return Object.freeze(
      [...entries.values()].map(({ locations, row }) =>
        Object.freeze({
          entryId: contentEntryId(row.entry_id),
          locations: Object.freeze(
            [...locations.values()]
              .sort(compareUsageLocations)
              .map((location): MediaUsageLocation =>
                location.blockKey === undefined
                  ? Object.freeze({
                      field: location.field,
                      source: "field" as const,
                      states: usageStates(location.states),
                    })
                  : Object.freeze({
                      blockKey: blockKey(location.blockKey),
                      blockType: location.blockType!,
                      field: location.field,
                      source: "block" as const,
                      states: usageStates(location.states),
                    }),
              ),
          ),
          modelKey: contentModelKey(row.model_key),
          ...(row.slug === null ? {} : { slug: row.slug }),
          status: entryStatus(row.status),
          title: row.title,
        }),
      ),
    );
  }

  public async exportBuildContent(): Promise<BuildContentExport> {
    const rows = this.connection
      .prepare(
        `select e.id, e.model_key, e.draft_snapshot_id, e.published_snapshot_id,
                r.path, s.created_at as published_created_at
           from published_routes r
           join content_entries e on e.id = r.entry_id and e.published_snapshot_id = r.snapshot_id
           join content_snapshots s on s.id = r.snapshot_id
          order by r.path asc`,
      )
      .all() as readonly PublicRow[];
    const entries = this.hydrate(rows);
    return Object.freeze({
      entries: Object.freeze(
        rows.map((row) => {
          const entry = entries.get(row.id);
          if (entry === undefined) failure("Build export contains an unreadable entry.");
          return Object.freeze({ entry: this.publicEntry(entry), path: row.path });
        }),
      ),
      version: await this.publishedContentVersion(),
    });
  }

  private entryRow(id: string): EntryRow | undefined {
    return this.connection
      .prepare(
        "select id, model_key, draft_snapshot_id, published_snapshot_id from content_entries where id = ?",
      )
      .get(id) as EntryRow | undefined;
  }

  private readConfigurationSyncStateNow(): readonly StoredContentModelState[] {
    const rows = this.connection
      .prepare(
        `select m.key, m.kind, m.config_version as version, m.structure_hash, m.projection_hash,
                count(e.id) as entry_count,
                sum(case when e.draft_snapshot_id is null then 0 else 1 end) as draft_snapshot_count,
                sum(case when e.published_snapshot_id is null then 0 else 1 end) as published_snapshot_count
           from content_models m
           left join content_entries e on e.model_key = m.key
          group by m.key, m.kind, m.config_version, m.structure_hash, m.projection_hash
          order by m.key asc`,
      )
      .all() as readonly StoredModelStateRow[];
    return Object.freeze(
      rows.map((row) => {
        if (row.kind !== "collection" && row.kind !== "page")
          failure("Stored model kind is invalid.");
        return Object.freeze({
          draftSnapshotCount: row.draft_snapshot_count,
          entryCount: row.entry_count,
          key: contentModelKey(row.key),
          kind: row.kind,
          projectionHash: row.projection_hash,
          publishedSnapshotCount: row.published_snapshot_count,
          structureHash: row.structure_hash,
          version: row.version,
        });
      }),
    );
  }

  private loadEntry(id: string): ContentEntry | null {
    const row = this.entryRow(id);
    if (row === undefined) return null;
    return this.hydrate([row]).get(row.id) ?? null;
  }

  /** Public projections cannot disclose the independently mutable draft snapshot. */
  private publicEntry(entry: ContentEntry): ContentEntry {
    if (entry.published === undefined) failure("Public entry is missing its published snapshot.");
    return Object.freeze({
      draft: Object.freeze({ ...entry.published, state: "draft" as const }),
      id: entry.id,
      model: entry.model,
      published: entry.published,
    });
  }

  private hydrate(rows: readonly EntryRow[]): Map<string, ContentEntry> {
    const snapshotIds = [
      ...new Set(
        rows
          .flatMap((row) => [row.draft_snapshot_id, row.published_snapshot_id])
          .filter((id): id is string => id !== null),
      ),
    ];
    const snapshots = this.loadSnapshots(snapshotIds);
    const result = new Map<string, ContentEntry>();
    for (const row of rows) {
      if (row.draft_snapshot_id === null) failure("Content entry is missing its draft snapshot.");
      const draftSource = snapshots.get(row.draft_snapshot_id);
      if (draftSource === undefined) failure("Content entry draft snapshot is missing.");
      const model = this.resolveModel(row.model_key);
      if (model === undefined)
        failure(`Content model ${row.model_key} is unavailable in runtime configuration.`);
      const draft = this.snapshot(draftSource, "draft");
      const publishedSource =
        row.published_snapshot_id === null ? undefined : snapshots.get(row.published_snapshot_id);
      if (row.published_snapshot_id !== null && publishedSource === undefined) {
        failure("Content entry published snapshot is missing.");
      }
      result.set(
        row.id,
        Object.freeze({
          draft,
          id: contentEntryId(row.id),
          model: Object.freeze({ ...model }),
          ...(publishedSource === undefined
            ? {}
            : { published: this.snapshot(publishedSource, "published") }),
        }),
      );
    }
    return result;
  }

  private loadSnapshots(ids: readonly string[]): Map<string, StoredSnapshot> {
    if (ids.length === 0) return new Map();
    const snapshots = new Map<string, StoredSnapshot>();
    const blockRows: BlockRow[] = [];
    for (const group of chunks(ids)) {
      const bindings = group.map(() => "?").join(", ");
      const rows = this.connection
        .prepare(
          `select s.id, s.entry_id, s.revision, s.slug, s.title, s.fields_json, s.schema_version,
                  s.created_at, s.updated_at, s.updated_by, u.role
             from content_snapshots s left join user u on u.id = s.updated_by
            where s.id in (${bindings})`,
        )
        .all(...group) as readonly SnapshotRow[];
      for (const row of rows) {
        snapshots.set(row.id, {
          blocks: [],
          createdAt: assertTimestamp(row.created_at, "Snapshot creation time"),
          entryId: row.entry_id,
          fields: parseObject(row.fields_json, "Snapshot fields"),
          id: row.id,
          revision: row.revision,
          ...(row.slug === null ? {} : { slug: row.slug }),
          title: row.title,
          updatedAt: assertTimestamp(row.updated_at, "Snapshot update time"),
          updatedBy: { id: actorId(row.updated_by), role: role(row.role) },
        });
      }
      blockRows.push(
        ...(this.connection
          .prepare(
            `select snapshot_id, block_key, block_type, position, schema_version, data_json, created_at, updated_at
               from content_blocks where snapshot_id in (${bindings}) order by snapshot_id asc, position asc`,
          )
          .all(...group) as readonly BlockRow[]),
      );
    }
    const grouped = new Map<string, ContentBlock[]>();
    for (const row of blockRows) {
      const blocks = grouped.get(row.snapshot_id) ?? [];
      blocks.push({
        data: parseObject(row.data_json, "Block data"),
        key: blockKey(row.block_key),
        position: row.position,
        schemaVersion: row.schema_version,
        type: row.block_type,
      });
      grouped.set(row.snapshot_id, blocks);
    }
    for (const [id, snapshot] of snapshots) {
      snapshots.set(id, { ...snapshot, blocks: Object.freeze(grouped.get(id) ?? []) });
    }
    return snapshots;
  }

  private snapshot(source: StoredSnapshot, state: "draft"): DraftSnapshot;
  private snapshot(source: StoredSnapshot, state: "published"): PublishedSnapshot;
  private snapshot(
    source: StoredSnapshot,
    state: "draft" | "published",
  ): DraftSnapshot | PublishedSnapshot {
    return Object.freeze({
      blocks: source.blocks,
      createdAt: unixMilliseconds(source.createdAt),
      entryId: contentEntryId(source.entryId),
      fields: source.fields,
      id: contentSnapshotId(source.id),
      revision: source.revision,
      ...(source.slug === undefined ? {} : { slug: source.slug }),
      state,
      title: source.title,
      updatedAt: unixMilliseconds(source.updatedAt),
      updatedBy: Object.freeze({ ...source.updatedBy }),
    }) as DraftSnapshot | PublishedSnapshot;
  }

  private insertSnapshot(snapshot: DraftSnapshot, schemaVersion: number): void {
    this.connection
      .prepare(
        "insert into content_snapshots (id, entry_id, revision, slug, title, fields_json, schema_version, created_at, updated_at, updated_by) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        snapshot.id,
        snapshot.entryId,
        snapshot.revision,
        snapshot.slug ?? null,
        snapshot.title,
        JSON.stringify(snapshot.fields),
        schemaVersion,
        snapshot.createdAt,
        snapshot.updatedAt,
        snapshot.updatedBy.id,
      );
  }

  private insertBlocks(snapshot: Pick<DraftSnapshot, "blocks" | "id" | "updatedAt">): void {
    const statement = this.connection.prepare(
      "insert into content_blocks (snapshot_id, block_key, block_type, position, schema_version, data_json, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?)",
    );
    for (const block of snapshot.blocks) {
      statement.run(
        snapshot.id,
        block.key,
        block.type,
        block.position,
        block.schemaVersion,
        JSON.stringify(block.data),
        snapshot.updatedAt,
        snapshot.updatedAt,
      );
    }
  }

  private insertReferences(
    snapshotId: string,
    references: readonly {
      readonly fieldPath: string;
      readonly mediaId: string;
      readonly sourceKey: string;
    }[],
    createdAt: number,
  ): void {
    const statement = this.connection.prepare(
      "insert into content_media_references (snapshot_id, source_key, field_path, media_id, created_at) select ?, ?, ?, id, ? from media where id = ? and status = 'active'",
    );
    for (const reference of references) {
      const inserted = statement.run(
        snapshotId,
        reference.sourceKey,
        reference.fieldPath,
        createdAt,
        reference.mediaId,
      );
      if (inserted.changes !== 1) failure("Media is unavailable for reference.");
    }
  }

  private requireLeasedMediaDeletionEvent(
    leaseId: string,
    now: number,
    mediaId: string,
  ): { readonly id: string } {
    const event = this.connection
      .prepare(
        "select id, payload_json from outbox_events where locked_by = ? and type = 'media.delete.requested' and processed_at is null and locked_at > ?",
      )
      .get(leaseId, now - DISPATCHER_LEASE_DURATION_MS) as
      | { readonly id: string; readonly payload_json: string }
      | undefined;
    if (event === undefined) failure("Dispatcher lease is missing or expired.");
    const payload = parseObject(event.payload_json, "Outbox payload");
    if (payload.mediaId !== mediaId) failure("Dispatcher event does not match media.");
    return event;
  }

  private checkpoint(name: string): void {
    this.options.beforeMutation?.(name);
  }

  private nextId(): string {
    if (this.options.nextId !== undefined) return this.options.nextId();
    return randomUUID();
  }

  private bumpPublicState(
    timestamp: number,
    requestedBy: string,
    snapshotId: string | null,
  ): number {
    this.checkpoint("public-state");
    this.connection
      .prepare(
        "insert into published_state (singleton_key, version, updated_at) values (1, 1, ?) on conflict(singleton_key) do update set version = version + 1, updated_at = excluded.updated_at",
      )
      .run(timestamp);
    const state = this.connection
      .prepare("select version from published_state where singleton_key = 1")
      .get() as { readonly version: number };
    this.checkpoint("build-outbox");
    const payload = JSON.stringify({
      publishedSnapshotId: snapshotId,
      targetVersion: state.version,
    });
    this.connection
      .prepare(
        "insert or ignore into outbox_events (id, type, payload_json, attempts, available_at, created_at) values (?, 'site.build.requested', ?, 0, ?, ?)",
      )
      .run(this.nextId(), payload, timestamp + 5_000, timestamp);
    this.connection
      .prepare(
        "update outbox_events set payload_json = ?, available_at = ? where type = 'site.build.requested' and processed_at is null and locked_at is null",
      )
      .run(payload, timestamp + 5_000);
    void requestedBy;
    return state.version;
  }

  private catalogItem(row: Record<string, unknown>): MediaCatalogItem {
    const media = this.mapMedia(row);
    const createdByName = typeof row.created_by_name === "string" ? row.created_by_name : null;
    return Object.freeze({
      createdBy: Object.freeze({
        displayName: actorDisplayName(media.createdBy, createdByName),
        id: media.createdBy,
      }),
      media,
      usageCount: assertNonNegativeInteger(row.usage_count, "Media usage count"),
    });
  }

  /** Classifies a refused deletion inside the same write transaction as its guard. */
  private refuseDeletion(
    mediaId: string,
    expectedStatus: MediaMetadata["status"],
    message: string,
  ): never {
    const row = this.connection
      .prepare(
        "select status, exists(select 1 from content_media_references where media_id = ?) as referenced from media where id = ?",
      )
      .get(mediaId, mediaId) as
      | { readonly referenced: number; readonly status: string }
      | undefined;
    if (row?.status === expectedStatus && row.referenced === 1) {
      throw new DomainError("MEDIA_IN_USE", "Media is still referenced by content.");
    }
    failure(message);
  }

  private mapMedia(row: Record<string, unknown>): MediaMetadata {
    const string = (name: string): string =>
      typeof row[name] === "string" ? row[name] : failure(`Media ${name} is invalid.`);
    const integer = (name: string): number =>
      typeof row[name] === "number" && Number.isSafeInteger(row[name])
        ? row[name]
        : failure(`Media ${name} is invalid.`);
    const status = string("status");
    if (status !== "active" && status !== "deleting" && status !== "delete_failed") {
      failure("Media status is invalid.");
    }
    const width = row.width;
    const height = row.height;
    return Object.freeze({
      createdAt: unixMilliseconds(integer("created_at")),
      createdBy: actorId(string("created_by")),
      filename: string("filename"),
      ...(typeof height === "number" ? { height } : {}),
      id: string("id") as MediaMetadata["id"],
      mimeType: string("mime_type"),
      size: integer("size"),
      status,
      storageKey: string("storage_key"),
      updatedAt: unixMilliseconds(integer("updated_at")),
      ...(typeof width === "number" ? { width } : {}),
    });
  }

  private throwWriteError(error: unknown, pageCreation: boolean): never {
    if (error instanceof DomainError) throw error;
    if (
      pageCreation &&
      error instanceof Error &&
      (error.message.includes("content_entries_singleton_idx") ||
        error.message.includes("UNIQUE constraint failed: content_entries.model_key"))
    ) {
      throw new DomainError(
        "CONTENT_MODEL_CARDINALITY_CONFLICT",
        "A page model already has its singleton entry.",
      );
    }
    throw new DomainError("CONTENT_INVALID_STATE", "SQLite content write failed.");
  }
}

export function nodeContentRepository(
  database: NodeDatabase,
  resolveModel: ContentModelResolver,
  options?: NodeRepositoryOptions,
): NodeContentRepository {
  return new NodeContentRepository(database.connection, resolveModel, options);
}
