import {
  opaqueCursor,
  planConfigurationSynchronization,
  renderConfigurationSyncPlanJson,
} from "@lacecms/application";
import type {
  ApplyConfigurationSynchronizationInput,
  ApplyConfigurationSynchronizationResult,
  BuildContentExport,
  ContentCommandResult,
  ContentEntryCommandPort,
  ContentEntryReadPort,
  ContentEntrySummary,
  ConfigurationSyncApplyPort,
  ConfigurationSyncStateReadPort,
  CreateContentEntryInput,
  CursorPage,
  ListContentEntriesInput,
  ListPublicContentInput,
  LoadContentEntryInput,
  MarkMediaForDeletionInput,
  MarkMediaForDeletionResult,
  MediaCommandPort,
  MediaReadPort,
  PublishContentEntryCommand,
  PublishContentEntryResult,
  PublicContentEntry,
  PublicContentReadPort,
  SaveCompleteDraftInput,
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
  readonly id: string;
  readonly model_key: string;
  readonly published_snapshot_id: string | null;
  readonly title: string;
  readonly updated_at: number;
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
    MediaCommandPort,
    PublicContentReadPort,
    MediaReadPort
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
        if (changed.changes !== 1) failure("Media is not eligible for deletion.");
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

  public async load(input: LoadContentEntryInput): Promise<ContentEntry | null> {
    return this.loadEntry(input.entryId);
  }

  public async loadDraft(input: LoadContentEntryInput): Promise<DraftSnapshot | null> {
    return this.loadEntry(input.entryId)?.draft ?? null;
  }

  public async loadPublished(input: LoadContentEntryInput): Promise<PublishedSnapshot | null> {
    return this.loadEntry(input.entryId)?.published ?? null;
  }

  public async list(input: ListContentEntriesInput): Promise<CursorPage<ContentEntrySummary>> {
    const limit = assertPageSize(input.limit);
    const after = input.after === undefined ? undefined : decodeCursor(input.after, "admin");
    const rows = this.connection
      .prepare(
        `select e.id, e.model_key, e.published_snapshot_id, d.revision as draft_revision,
                d.title, e.updated_at
           from content_entries e join content_snapshots d on d.id = e.draft_snapshot_id
          where e.model_key = ?
            ${after === undefined ? "" : "and (e.updated_at < ? or (e.updated_at = ? and e.id < ?))"}
          order by e.updated_at desc, e.id desc limit ?`,
      )
      .all(
        ...(after === undefined
          ? [input.modelKey, limit + 1]
          : [input.modelKey, after.timestamp, after.timestamp, after.id, limit + 1]),
      ) as readonly SummaryRow[];
    const pageRows = rows.slice(0, limit);
    const items = pageRows.map((row) => ({
      draftRevision: row.draft_revision,
      id: contentEntryId(row.id),
      modelKey: contentModelKey(row.model_key),
      ...(row.published_snapshot_id === null
        ? {}
        : { publishedSnapshotId: contentSnapshotId(row.published_snapshot_id) }),
      title: row.title,
      updatedAt: unixMilliseconds(assertTimestamp(row.updated_at, "Entry timestamp")),
    }));
    const last = pageRows.at(-1);
    return Object.freeze({
      items: Object.freeze(items),
      ...(rows.length > limit && last !== undefined
        ? { nextCursor: encodeCursor("admin", last.updated_at, last.id) }
        : {}),
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
      return Object.freeze({ entry, path: row.path });
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
    return entry === undefined ? null : Object.freeze({ entry, path: row.path });
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
          return Object.freeze({ entry, path: row.path });
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
      "insert into content_media_references (snapshot_id, source_key, field_path, media_id, created_at) values (?, ?, ?, ?, ?)",
    );
    for (const reference of references) {
      statement.run(
        snapshotId,
        reference.sourceKey,
        reference.fieldPath,
        reference.mediaId,
        createdAt,
      );
    }
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
