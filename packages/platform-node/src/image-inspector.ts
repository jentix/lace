import type { ImageDimensions, ImageInspector, MediaMimeType } from "@lacecms/application";
import { DomainError } from "@lacecms/domain";
import sharp from "sharp";

function expectedFormat(mimeType: MediaMimeType): "avif" | "jpeg" | "png" | "webp" {
  switch (mimeType) {
    case "image/avif":
      return "avif";
    case "image/jpeg":
      return "jpeg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
  }
}

/** Node image inspector used only after the portable media policy identifies a candidate format. */
export class NodeSharpImageInspector implements ImageInspector {
  public async inspect(bytes: Uint8Array, mimeType: MediaMimeType): Promise<ImageDimensions> {
    try {
      const metadata = await sharp(bytes, { failOn: "error", limitInputPixels: false }).metadata();
      const format =
        mimeType === "image/avif" && metadata.format === "heif" ? "avif" : metadata.format;
      if (
        format !== expectedFormat(mimeType) ||
        metadata.width === undefined ||
        metadata.height === undefined
      ) {
        throw new DomainError("CONTENT_INVALID_STATE", "Media image data is invalid.");
      }
      return { height: metadata.height, width: metadata.width };
    } catch (error) {
      if (error instanceof DomainError) throw error;
      throw new DomainError("CONTENT_INVALID_STATE", "Media image data is invalid.");
    }
  }
}
