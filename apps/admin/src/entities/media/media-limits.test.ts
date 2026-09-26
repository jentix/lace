import { expect, test } from "vitest";
import {
  formatMediaDimensions,
  maxMediaBytes,
  mediaTypeLabel,
  validateMediaFile,
} from "./media-limits.js";

test("files are checked by MIME type, extension fallback, and size", () => {
  expect(validateMediaFile({ name: "a.png", size: 10, type: "image/png" })).toBeUndefined();
  expect(validateMediaFile({ name: "a.pdf", size: 10, type: "application/pdf" })).toBe("type");
  expect(validateMediaFile({ name: "a.gif", size: 10, type: "image/gif" })).toBe("type");
  expect(validateMediaFile({ name: "photo.JPEG", size: 10, type: "" })).toBeUndefined();
  expect(validateMediaFile({ name: "notes", size: 10, type: "" })).toBe("type");
  expect(validateMediaFile({ name: "a.webp", size: maxMediaBytes, type: "image/webp" })).toBe(
    undefined,
  );
  expect(validateMediaFile({ name: "a.webp", size: maxMediaBytes + 1, type: "image/webp" })).toBe(
    "size",
  );
});

test("type labels name the supported formats", () => {
  expect(mediaTypeLabel("image/jpeg")).toBe("JPEG");
  expect(mediaTypeLabel("image/webp")).toBe("WebP");
  expect(mediaTypeLabel("image/gif")).toBe("image/gif");
});

test("dimensions format as pixels or unknown", () => {
  expect(formatMediaDimensions({ height: 600, width: 800 })).toBe("800 × 600 px");
  expect(formatMediaDimensions({ width: 800 })).toBe("Unknown");
});
