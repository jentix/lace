import { expect, test } from "vitest";
import { formatBytes } from "./format-bytes.js";

test("byte counts format with a 1024 base and one decimal", () => {
  expect(formatBytes(0)).toBe("0 B");
  expect(formatBytes(512)).toBe("512 B");
  expect(formatBytes(1536)).toBe("1.5 KB");
  expect(formatBytes(10 * 1024 * 1024)).toBe("10 MB");
  expect(formatBytes(3 * 1024 ** 3)).toBe("3 GB");
  expect(formatBytes(-1)).toBe("");
  expect(formatBytes(Number.NaN)).toBe("");
});
