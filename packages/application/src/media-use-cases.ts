import { DomainError, mediaId, requirePermission } from "@lacecms/domain";
import type { Actor, MediaId, MediaMetadata, UnixMilliseconds } from "@lacecms/domain";
import type {
  ByteStream,
  Clock,
  CursorPage,
  IdGenerator,
  ImageInspector,
  ListMediaInput,
  MediaCommandPort,
  MediaListPort,
  MediaMimeType,
  MediaReadPort,
  ObjectStorage,
  OperationalLogger,
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
  readonly createdBy: string;
  readonly filename: string;
  readonly height?: number;
  readonly id: MediaId;
  readonly mimeType: MediaMimeType;
  readonly size: number;
  readonly status: MediaMetadata["status"];
  readonly updatedAt: UnixMilliseconds;
  readonly width?: number;
}

export interface CreateMediaUseCaseInput {
  readonly actor: Actor;
  readonly body: ByteStream;
  readonly filename: string;
}

export interface ListMediaUseCaseInput extends ListMediaInput {
  readonly actor: Actor;
}

export interface GetMediaUseCaseInput {
  readonly actor: Actor;
  readonly mediaId: MediaId;
}

export interface DeleteMediaUseCaseInput extends GetMediaUseCaseInput {}

export interface MediaUseCaseDependencies {
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
  readonly imageInspector: ImageInspector;
  readonly logger: OperationalLogger;
  readonly media: MediaReadPort & MediaListPort & MediaCommandPort;
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

function toMediaView(value: MediaMetadata): MediaView {
  const mimeType = value.mimeType;
  if (!ALLOWED_MEDIA_MIME_TYPES.includes(mimeType as MediaMimeType)) {
    failure("Media metadata has an unsupported MIME type.");
  }
  return Object.freeze({
    createdAt: value.createdAt,
    createdBy: value.createdBy,
    filename: value.filename,
    ...(value.height === undefined ? {} : { height: value.height }),
    id: value.id,
    mimeType: mimeType as MediaMimeType,
    size: value.size,
    status: value.status,
    updatedAt: value.updatedAt,
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
      const media = await this.dependencies.media.createMedia({
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
      return toMediaView(detached(media));
    } catch (error) {
      await this.cleanupAfterMetadataFailure(storageKey, true);
      throw error;
    }
  }

  public async get(input: GetMediaUseCaseInput): Promise<MediaView | null> {
    requirePermission(input.actor, "content:read");
    const media = await this.dependencies.media.loadMedia(input.mediaId);
    return media === null ? null : toMediaView(detached(media));
  }

  public async list(input: ListMediaUseCaseInput): Promise<CursorPage<MediaView>> {
    requirePermission(input.actor, "content:read");
    const page = await this.dependencies.media.listMedia({
      ...(input.after === undefined ? {} : { after: input.after }),
      limit: input.limit,
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
    return toMediaView(detached(result.media));
  }

  public async retryDeletion(input: DeleteMediaUseCaseInput): Promise<MediaView> {
    requirePermission(input.actor, "media:write");
    const result = await this.dependencies.media.retryDeletion({
      mediaId: input.mediaId,
      requestedAt: this.dependencies.clock.now(),
      requestedBy: input.actor,
    });
    return toMediaView(detached(result.media));
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
