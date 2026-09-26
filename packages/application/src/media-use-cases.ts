import { DomainError, mediaId, requirePermission } from "@lacecms/domain";
import type { Actor, MediaId, MediaMetadata, UnixMilliseconds } from "@lacecms/domain";
import {
  DEFAULT_MEDIA_SORT,
  MAX_MEDIA_SEARCH_LENGTH,
  MAX_MEDIA_USAGE_ENTRIES,
  MEDIA_SORTS,
} from "./index.js";
import type {
  ActorSummary,
  ByteStream,
  Clock,
  CursorPage,
  IdGenerator,
  ImageInspector,
  MediaCatalogItem,
  MediaCatalogPort,
  MediaCommandPort,
  MediaListPort,
  MediaMimeType,
  MediaReadPort,
  MediaSort,
  MediaUsageEntry,
  ObjectStorage,
  OpaqueCursor,
  OperationalLogger,
  PublicContentReadPort,
} from "./index.js";

export const MAX_MEDIA_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 12_000;
export const MAX_IMAGE_PIXELS = 100_000_000;
export const ALLOWED_MEDIA_MIME_TYPES = Object.freeze([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const);

export interface MediaView {
  readonly createdAt: UnixMilliseconds;
  readonly createdBy: ActorSummary;
  readonly filename: string;
  readonly height?: number;
  readonly id: MediaId;
  readonly mimeType: MediaMimeType;
  readonly size: number;
  readonly status: MediaMetadata["status"];
  readonly updatedAt: UnixMilliseconds;
  readonly usageCount: number;
  readonly width?: number;
}

/** A single media item with the bounded list of entries that use it. */
export interface MediaDetailView extends MediaView {
  readonly usage: readonly MediaUsageEntry[];
}

export interface CreateMediaUseCaseInput {
  readonly actor: Actor;
  readonly body: ByteStream;
  readonly filename: string;
}

export interface ListMediaUseCaseInput {
  readonly actor: Actor;
  readonly after?: OpaqueCursor;
  readonly limit: number;
  readonly q?: string;
  readonly sort?: string;
  readonly type?: string;
}

export interface GetMediaUseCaseInput {
  readonly actor: Actor;
  readonly mediaId: MediaId;
}

export interface DeleteMediaUseCaseInput extends GetMediaUseCaseInput {}

export interface PublicMediaBinaryUseCaseInput {
  readonly mediaId: MediaId;
}

export interface MediaBinary {
  readonly body: ByteStream;
  readonly filename: string;
  readonly mimeType: MediaMimeType;
}

export interface MediaUseCaseDependencies {
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
  readonly imageInspector: ImageInspector;
  readonly logger: OperationalLogger;
  readonly media: MediaReadPort & MediaListPort & MediaCatalogPort & MediaCommandPort;
  readonly publicMedia?: Pick<PublicContentReadPort, "loadPublicMedia">;
  readonly storage: ObjectStorage;
}

function failure(message: string): never {
  throw new DomainError("CONTENT_INVALID_STATE", message);
}

function detached<Value>(value: Value): Value {
  return JSON.parse(JSON.stringify(value)) as Value;
}

function isPrefix(bytes: Uint8Array, prefix: readonly number[]): boolean {
  return prefix.every((value, index) => bytes[index] === value);
}

/** Detects format only; ImageInspector validates container structure and dimensions. */
export function detectMediaMimeType(bytes: Uint8Array): MediaMimeType {
  if (bytes.byteLength === 0) failure("Media upload must not be empty.");
  if (isPrefix(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (isPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (
    bytes.byteLength >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  if (
    bytes.byteLength >= 16 &&
    String.fromCharCode(...bytes.slice(4, 8)) === "ftyp" &&
    ["avif", "avis"].includes(String.fromCharCode(...bytes.slice(8, 12)))
  ) {
    return "image/avif";
  }
  failure("Media upload is not an allowed image format.");
}

export function sanitizeMediaFilename(value: string): string {
  const withoutUnsafeCharacters = [...value.normalize("NFKC")]
    .map((character) => {
      const code = character.charCodeAt(0);
      return code <= 0x1f ||
        (code >= 0x7f && code <= 0x9f) ||
        character === "/" ||
        character === "\\"
        ? " "
        : character;
    })
    .join("");
  const normalized = withoutUnsafeCharacters.replace(/\s+/gu, " ").trim().slice(0, 255);
  return normalized.length === 0 ? "upload" : normalized;
}

export async function collectMediaBytes(body: ByteStream): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of body) {
    if (!(chunk instanceof Uint8Array)) failure("Media stream yielded invalid binary data.");
    size += chunk.byteLength;
    if (size > MAX_MEDIA_BYTES) failure("Media upload exceeds the 10 MiB limit.");
    chunks.push(chunk.slice());
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function streamBytes(bytes: Uint8Array): ByteStream {
  return {
    async *[Symbol.asyncIterator](): AsyncGenerator<Uint8Array> {
      yield bytes.slice();
    },
  };
}

function toMediaView(item: MediaCatalogItem): MediaView {
  const value = item.media;
  const mimeType = value.mimeType;
  if (!ALLOWED_MEDIA_MIME_TYPES.includes(mimeType as MediaMimeType)) {
    failure("Media metadata has an unsupported MIME type.");
  }
  return Object.freeze({
    createdAt: value.createdAt,
    createdBy: Object.freeze({ displayName: item.createdBy.displayName, id: item.createdBy.id }),
    filename: value.filename,
    ...(value.height === undefined ? {} : { height: value.height }),
    id: value.id,
    mimeType: mimeType as MediaMimeType,
    size: value.size,
    status: value.status,
    updatedAt: value.updatedAt,
    usageCount: item.usageCount,
    ...(value.width === undefined ? {} : { width: value.width }),
  });
}

function validateDimensions(width: number, height: number): void {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > MAX_IMAGE_DIMENSION ||
    height > MAX_IMAGE_DIMENSION ||
    width * height > MAX_IMAGE_PIXELS
  ) {
    failure("Image dimensions exceed the allowed limits.");
  }
}

/** Portable orchestration for media policy and metadata lifecycle commands. */
export class MediaUseCases {
  public constructor(private readonly dependencies: MediaUseCaseDependencies) {}

  public async create(input: CreateMediaUseCaseInput): Promise<MediaView> {
    requirePermission(input.actor, "media:write");
    const bytes = await collectMediaBytes(input.body);
    const mimeType = detectMediaMimeType(bytes);
    const dimensions = await this.dependencies.imageInspector.inspect(bytes, mimeType);
    validateDimensions(dimensions.width, dimensions.height);
    const id = mediaId(this.dependencies.idGenerator.next());
    const storageKey = `media/${id}`;
    const stored = await this.dependencies.storage.put({
      body: streamBytes(bytes),
      contentType: mimeType,
      key: storageKey,
    });
    if (
      stored.key !== storageKey ||
      stored.contentType !== mimeType ||
      stored.size !== bytes.byteLength
    ) {
      await this.cleanupAfterMetadataFailure(storageKey, false);
      failure("Object storage returned unexpected media metadata.");
    }
    const now = this.dependencies.clock.now();
    try {
      await this.dependencies.media.createMedia({
        createdAt: now,
        createdBy: input.actor.id,
        filename: sanitizeMediaFilename(input.filename),
        height: dimensions.height,
        id,
        mimeType,
        size: bytes.byteLength,
        storageKey,
        width: dimensions.width,
      });
    } catch (error) {
      await this.cleanupAfterMetadataFailure(storageKey, true);
      throw error;
    }
    // Metadata is committed: a reload failure must not trigger object cleanup.
    return this.catalogView(id, "Created media could not be reloaded.");
  }

  public async get(input: GetMediaUseCaseInput): Promise<MediaDetailView | null> {
    requirePermission(input.actor, "content:read");
    const item = await this.dependencies.media.loadMediaCatalogItem(input.mediaId);
    if (item === null) return null;
    const usage = await this.dependencies.media.loadMediaUsage({
      limit: MAX_MEDIA_USAGE_ENTRIES,
      mediaId: input.mediaId,
    });
    return Object.freeze({
      ...toMediaView(detached(item)),
      usage: Object.freeze(detached(usage.slice(0, MAX_MEDIA_USAGE_ENTRIES))),
    });
  }

  public async list(input: ListMediaUseCaseInput): Promise<CursorPage<MediaView>> {
    requirePermission(input.actor, "content:read");
    const q = input.q?.trim();
    if (q !== undefined && q.length > MAX_MEDIA_SEARCH_LENGTH) {
      failure(`Search terms must not exceed ${MAX_MEDIA_SEARCH_LENGTH} characters.`);
    }
    if (
      input.type !== undefined &&
      !ALLOWED_MEDIA_MIME_TYPES.includes(input.type as MediaMimeType)
    ) {
      failure("Media type filter is unsupported.");
    }
    if (input.sort !== undefined && !MEDIA_SORTS.includes(input.sort as MediaSort)) {
      failure("Media sort is unsupported.");
    }
    const page = await this.dependencies.media.listMedia({
      ...(input.after === undefined ? {} : { after: input.after }),
      limit: input.limit,
      ...(q === undefined || q.length === 0 ? {} : { q }),
      sort: (input.sort as MediaSort | undefined) ?? DEFAULT_MEDIA_SORT,
      ...(input.type === undefined ? {} : { type: input.type as MediaMimeType }),
    });
    return Object.freeze({
      items: Object.freeze(page.items.map((item) => toMediaView(detached(item)))),
      ...(page.nextCursor === undefined ? {} : { nextCursor: page.nextCursor }),
    });
  }

  public async requestDeletion(input: DeleteMediaUseCaseInput): Promise<MediaView> {
    requirePermission(input.actor, "media:write");
    const result = await this.dependencies.media.markForDeletion({
      mediaId: input.mediaId,
      requestedAt: this.dependencies.clock.now(),
      requestedBy: input.actor,
    });
    return this.catalogView(result.media.id, "Media deletion mark could not be reloaded.");
  }

  public async retryDeletion(input: DeleteMediaUseCaseInput): Promise<MediaView> {
    requirePermission(input.actor, "media:write");
    const result = await this.dependencies.media.retryDeletion({
      mediaId: input.mediaId,
      requestedAt: this.dependencies.clock.now(),
      requestedBy: input.actor,
    });
    return this.catalogView(result.media.id, "Media deletion retry could not be reloaded.");
  }

  public async preview(input: GetMediaUseCaseInput): Promise<MediaBinary | null> {
    requirePermission(input.actor, "content:read");
    const media = await this.dependencies.media.loadMedia(input.mediaId);
    return media === null || media.status !== "active" ? null : this.readBinary(media);
  }

  public async readPublic(input: PublicMediaBinaryUseCaseInput): Promise<MediaBinary | null> {
    const media = await this.dependencies.publicMedia?.loadPublicMedia(input.mediaId);
    return media === undefined || media === null || media.status !== "active"
      ? null
      : this.readBinary(media);
  }

  private async catalogView(id: MediaId, missing: string): Promise<MediaView> {
    const item = await this.dependencies.media.loadMediaCatalogItem(id);
    if (item === null) throw new Error(missing);
    return toMediaView(detached(item));
  }

  private async readBinary(media: MediaMetadata): Promise<MediaBinary> {
    const mimeType = media.mimeType;
    if (!ALLOWED_MEDIA_MIME_TYPES.includes(mimeType as MediaMimeType)) {
      throw new Error("Stored media has an unsupported MIME type.");
    }
    const body = await this.dependencies.storage.get(media.storageKey);
    if (body === null) throw new Error("Stored media object is unavailable.");
    return Object.freeze({
      body,
      filename: sanitizeMediaFilename(media.filename),
      mimeType: mimeType as MediaMimeType,
    });
  }

  private async cleanupAfterMetadataFailure(
    storageKey: string,
    metadataFailure: boolean,
  ): Promise<void> {
    if (metadataFailure) {
      await this.recordOperationalError({
        code: "MEDIA_METADATA_CREATE_FAILED",
        storageKey,
      });
    }
    try {
      await this.dependencies.storage.delete(storageKey);
    } catch {
      await this.recordOperationalError({
        code: "MEDIA_OBJECT_CLEANUP_FAILED",
        storageKey,
      });
    }
  }

  private async recordOperationalError(input: {
    readonly code: "MEDIA_METADATA_CREATE_FAILED" | "MEDIA_OBJECT_CLEANUP_FAILED";
    readonly storageKey: string;
  }): Promise<void> {
    try {
      await this.dependencies.logger.error(input);
    } catch {
      // Operational logging must not prevent object cleanup or replace the original failure.
    }
  }
}
