import { expect, test } from "vitest";
import { formatAbsoluteTime, formatRelativeTime } from "./relative-time.js";

const now = Date.parse("2026-09-26T12:00:00.000Z");
const ago = (seconds: number) => new Date(now - seconds * 1000).toISOString();

test("relative time covers seconds through years with auto phrasing", () => {
  expect(formatRelativeTime(ago(10), now)).toBe("now");
  expect(formatRelativeTime(ago(5 * 60), now)).toBe("5 minutes ago");
  expect(formatRelativeTime(ago(2 * 60 * 60), now)).toBe("2 hours ago");
  expect(formatRelativeTime(ago(24 * 60 * 60), now)).toBe("yesterday");
  expect(formatRelativeTime(ago(14 * 24 * 60 * 60), now)).toBe("2 weeks ago");
  expect(formatRelativeTime(ago(60 * 24 * 60 * 60), now)).toBe("2 months ago");
  expect(formatRelativeTime(ago(800 * 24 * 60 * 60), now)).toBe("2 years ago");
});

test("relative time formats future values and rejects invalid input", () => {
  expect(formatRelativeTime(ago(-3 * 60 * 60), now)).toBe("in 3 hours");
  expect(formatRelativeTime("not a date", now)).toBe("");
  expect(formatAbsoluteTime("not a date")).toBe("");
  expect(formatAbsoluteTime(ago(0))).toMatch(/2026/);
});
