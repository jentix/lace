import type { NormalizedContentModel } from "@lacecms/config";
import type { JsonObject } from "@lacecms/content";
import type {
  Actor,
  ActorId,
  Brand,
  CompleteDraftMutation,
  ContentEntry,
  ContentEntryId,
  ContentModelKey,
  ContentModelRoute,
  ContentSnapshotId,
  MediaMetadata,
  PublishedSnapshot,
  SiteBuildId,
  UnixMilliseconds,
} from "@lacecms/domain";

export const packageName = "@lacecms/application";

export type OpaqueCursor = Brand<string, "OpaqueCursor">;
export type OpaqueTokenSecret = Brand<string, "OpaqueTokenSecret">;
export type OpaqueTokenVerifier = Brand<string, "OpaqueTokenVerifier">;
export type DispatcherEventId = Brand<string, "DispatcherEventId">;
export type DispatcherLeaseId = Brand<string, "DispatcherLeaseId">;
export type PublicationIdempotencyKey = Brand<string, "PublicationIdempotencyKey">;
export type PublicationRequestFingerprint = Brand<string, "PublicationRequestFingerprint">;

function opaqueBrand<Name extends string>(value: string, name: Name): Brand<string, Name> {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${name} must be a non-empty string.`);
  }
  return value as Brand<string, Name>;
}

export function opaqueCursor(value: string): OpaqueCursor {
  return opaqueBrand(value, "OpaqueCursor");
}

export function opaqueTokenSecret(value: string): OpaqueTokenSecret {
  return opaqueBrand(value, "OpaqueTokenSecret");
}

export function opaqueTokenVerifier(value: string): OpaqueTokenVerifier {
  return opaqueBrand(value, "OpaqueTokenVerifier");
}

export function dispatcherEventId(value: string): DispatcherEventId {
  return opaqueBrand(value, "DispatcherEventId");
}

export function dispatcherLeaseId(value: string): DispatcherLeaseId {
  return opaqueBrand(value, "DispatcherLeaseId");
}

/** A caller-supplied key that makes one guarded publication retry-safe. */
export function publicationIdempotencyKey(value: string): PublicationIdempotencyKey {
  return opaqueBrand(value, "PublicationIdempotencyKey");
}

/** Canonical application-generated identity of the complete publication request. */
export function publicationRequestFingerprint(value: string): PublicationRequestFingerprint {
  return opaqueBrand(value, "PublicationRequestFingerprint");
}

/** A transport-neutral cursor page. Cursors are intentionally opaque to callers. */
export interface CursorPage<Value> {
  readonly items: readonly Value[];
  readonly nextCursor?: OpaqueCursor;
}

/** A configuration-model projection retained by synchronization adapters. */
export interface ModelSyncRecord {
  readonly key: ContentModelKey;
  readonly kind: ContentModelRoute["kind"];
  readonly projectionHash: string;
  readonly structureHash: string;
  readonly version: number;
}

export interface ModelSyncInspection {
  readonly added: readonly ContentModelKey[];
  readonly changed: readonly ContentModelKey[];
  readonly removed: readonly ContentModelKey[];
}

export interface InspectModelSyncInput {
  readonly models: readonly NormalizedContentModel[];
}

export interface ApplyModelSyncInput extends InspectModelSyncInput {
  readonly expectedStructureHash?: string;
}

export interface ApplyModelSyncResult {
  readonly inspection: ModelSyncInspection;
  readonly models: readonly ModelSyncRecord[];
}

export interface ModelSyncPort {
  apply(input: ApplyModelSyncInput): Promise<ApplyModelSyncResult>;
  inspect(input: InspectModelSyncInput): Promise<ModelSyncInspection>;
}

export interface ContentEntrySummary {
  readonly draftRevision: number;
  readonly id: ContentEntryId;
  readonly modelKey: ContentModelKey;
  readonly publishedSnapshotId?: ContentSnapshotId;
  readonly title: string;
  readonly updatedAt: UnixMilliseconds;
}

export interface LoadContentEntryInput {
  readonly entryId: ContentEntryId;
}

export interface ListContentEntriesInput {
  readonly after?: OpaqueCursor;
  readonly limit: number;
  readonly modelKey: ContentModelKey;
}

export interface ContentEntryReadPort {
  load(input: LoadContentEntryInput): Promise<ContentEntry | null>;
  loadDraft(input: LoadContentEntryInput): Promise<ContentEntry["draft"] | null>;
  loadPublished(input: LoadContentEntryInput): Promise<PublishedSnapshot | null>;
  list(input: ListContentEntriesInput): Promise<CursorPage<ContentEntrySummary>>;
}

export interface CreateContentEntryInput {
  readonly entry: ContentEntry;
}

export interface SaveCompleteDraftInput {
  readonly entryId: ContentEntryId;
  readonly mutation: CompleteDraftMutation;
}

export interface PublishContentEntryCommand {
  readonly entryId: ContentEntryId;
  readonly expectedRevision: number;
  readonly idempotency?: PublicationIdempotency;
  readonly publishedAt: UnixMilliseconds;
  readonly publishedBy: Actor;
  readonly publishedSnapshotId: ContentSnapshotId;
}

/** Atomic idempotency scope retained alongside a successful publication. */
export interface PublicationIdempotency {
  readonly actorId: ActorId;
  readonly fingerprint: PublicationRequestFingerprint;
  readonly key: PublicationIdempotencyKey;
}

export interface DeleteContentEntryInput {
  readonly entryId: ContentEntryId;
}

export type ContentCommandStatus = "created" | "deleted" | "published" | "saved";

/** A complete state change returned by a specialized atomic command. */
export interface ContentCommandResult {
  readonly entry?: ContentEntry;
  readonly status: ContentCommandStatus;
}

/** A publication result distinguishes a fresh commit from an idempotent replay. */
export interface PublishContentEntryResult {
  readonly entry: ContentEntry;
  readonly outcome: "published" | "replayed";
  readonly status: "published";
}

/**
 * Specialized state-changing operations. These deliberately replace a generic
 * transaction callback so D1 and SQLite can preserve identical semantics.
 */
export interface ContentEntryCommandPort {
  create(input: CreateContentEntryInput): Promise<ContentCommandResult>;
  delete(input: DeleteContentEntryInput): Promise<ContentCommandResult>;
  publish(input: PublishContentEntryCommand): Promise<PublishContentEntryResult>;
  saveCompleteDraft(input: SaveCompleteDraftInput): Promise<ContentCommandResult>;
}

export interface PublicContentEntry {
  readonly entry: ContentEntry;
  readonly path: string;
}

export interface ListPublicContentInput {
  readonly after?: OpaqueCursor;
  readonly limit: number;
}

export interface BuildContentExport {
  readonly entries: readonly PublicContentEntry[];
  readonly version: number;
}

export interface PublicContentReadPort {
  exportBuildContent(): Promise<BuildContentExport>;
  listPublic(input: ListPublicContentInput): Promise<CursorPage<PublicContentEntry>>;
}

export interface PutObjectInput {
  readonly body: ByteStream;
  readonly contentType: string;
  readonly key: string;
}

export interface StoredObject {
  readonly contentType: string;
  readonly key: string;
  readonly size: number;
}

/** A portable binary stream without binding the application layer to a runtime API. */
export interface ByteStream extends AsyncIterable<Uint8Array> {}

export interface ReadUrlOptions {
  readonly expiresAt?: UnixMilliseconds;
}

export interface ObjectStorage {
  createReadUrl(key: string, options?: ReadUrlOptions): Promise<string>;
  delete(key: string): Promise<void>;
  get(key: string): Promise<ByteStream | null>;
  put(input: PutObjectInput): Promise<StoredObject>;
}

/** A derived cache; callers must always remain correct on a miss. */
export interface Cache {
  delete(key: string): Promise<void>;
  get<Value>(key: string): Promise<Value | null>;
  set<Value>(key: string, value: Value): Promise<void>;
}

export interface SiteBuildRequest {
  readonly requestedAt: UnixMilliseconds;
  readonly requestedBy: Actor;
  readonly targetVersion: number;
}

export interface BuildTriggerResult {
  readonly accepted: boolean;
  readonly buildId?: SiteBuildId;
}

export interface SiteBuildTrigger {
  trigger(input: SiteBuildRequest): Promise<BuildTriggerResult>;
}

export interface Clock {
  now(): UnixMilliseconds;
}

export interface IdGenerator {
  next(): string;
}

/** Persistence receives only the derived verifier, never an opaque secret. */
export interface OpaqueTokenHasher {
  hash(secret: OpaqueTokenSecret): Promise<OpaqueTokenVerifier>;
  verify(secret: OpaqueTokenSecret, verifier: OpaqueTokenVerifier): Promise<boolean>;
}

export interface DispatcherEvent {
  readonly attempts: number;
  readonly availableAt: UnixMilliseconds;
  readonly id: DispatcherEventId;
  readonly payload: JsonObject;
  readonly type: string;
}

export interface DispatcherLease {
  readonly event: DispatcherEvent;
  readonly expiresAt: UnixMilliseconds;
  readonly id: DispatcherLeaseId;
}

export interface ClaimDispatcherEventsInput {
  readonly leaseDurationMs: number;
  readonly limit: number;
  readonly now: UnixMilliseconds;
}

export interface CompleteDispatcherLeaseInput {
  readonly completedAt: UnixMilliseconds;
  readonly error?: string;
  readonly leaseId: DispatcherLeaseId;
  readonly outcome: "failed" | "succeeded";
}

export interface DispatcherLeasePort {
  claim(input: ClaimDispatcherEventsInput): Promise<readonly DispatcherLease[]>;
  complete(input: CompleteDispatcherLeaseInput): Promise<void>;
}

/** Metadata-only media reads remain separate from binary object storage. */
export interface MediaReadPort {
  loadMedia(id: string): Promise<MediaMetadata | null>;
}

export * from "./content-use-cases.js";
