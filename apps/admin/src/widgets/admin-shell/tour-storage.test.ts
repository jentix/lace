import { expect, test } from "vitest";
import { createTourRecords, tourStorageKey, type TourStatus } from "./tour-storage.js";
const scope = { origin: "https://lace.test", basepath: "/admin", userId: "user:1" };
function fixture() {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  return { values, storage };
}
test("whole status records survive new instances and independent writers", () => {
  const { values, storage } = fixture();
  const first = createTourRecords(scope, () => storage, new Map());
  expect(first.read()).toBeUndefined();
  first.write("completed");
  expect(createTourRecords(scope, () => storage, new Map()).read()).toBe("completed");
  createTourRecords(scope, () => storage, new Map()).write("dismissed");
  expect(first.read()).toBe("dismissed");
  expect(JSON.parse(values.get(tourStorageKey(scope))!)).toEqual({
    version: 1,
    status: "dismissed",
  });
});
test("user, installation, path, version and encoded separators are isolated", () => {
  const { storage } = fixture();
  createTourRecords(scope, () => storage).write("completed");
  for (const change of [
    { userId: "other" },
    { origin: "https://other.test" },
    { basepath: "/cms" },
    { version: 2 },
  ])
    expect(createTourRecords({ ...scope, ...change }, () => storage).read()).toBeUndefined();
  expect(tourStorageKey({ ...scope, origin: "a:b", basepath: "c" })).not.toBe(
    tourStorageKey({ ...scope, origin: "a", basepath: "b:c" }),
  );
});
test("invalid, missing, unsupported and cleared records are unseen", () => {
  const { values, storage } = fixture();
  const records = createTourRecords(scope, () => storage, new Map());
  for (const value of [
    "null",
    "{}",
    "broken",
    '{"version":2,"status":"completed"}',
    '{"version":1,"status":"other"}',
  ]) {
    values.set(tourStorageKey(scope), value);
    expect(records.read()).toBeUndefined();
  }
  records.write("completed");
  values.set(tourStorageKey(scope), "broken");
  expect(records.read()).toBeUndefined();
  values.clear();
  expect(records.read()).toBeUndefined();
});
test("missing, denied acquisition, read and write failures keep document fallback", () => {
  for (const acquire of [
    () => undefined,
    () => ({
      getItem: () => null,
      setItem: () => {
        throw Error("write only");
      },
    }),
    () => {
      throw Error("denied");
    },
    () => ({
      getItem: () => {
        throw Error("read");
      },
      setItem: () => {
        throw Error("write");
      },
    }),
  ]) {
    const memory = new Map<string, TourStatus>();
    const records = createTourRecords(scope, acquire, memory);
    expect(records.read()).toBeUndefined();
    records.write("dismissed");
    expect(createTourRecords(scope, acquire, memory).read()).toBe("dismissed");
  }
});
