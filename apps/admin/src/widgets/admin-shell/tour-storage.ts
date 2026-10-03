export type TourStatus = "completed" | "dismissed";
export interface TourScope {
  readonly origin: string;
  readonly basepath: string;
  readonly userId: string;
  readonly version?: number;
}
type TourStorage = Pick<Storage, "getItem" | "setItem">;
const documentRecords = new Map<string, TourStatus>();
const failedWrites = new WeakMap<Map<string, TourStatus>, Set<string>>();

export function tourStorageKey(scope: TourScope): string {
  return `lace:introduction:v${scope.version ?? 1}:${[scope.origin, scope.basepath, scope.userId].map(encodeURIComponent).join(":")}`;
}

/** Acquisition as well as operations can throw in privacy-restricted browsers. */
function browserStorage(): TourStorage | undefined {
  return window.localStorage;
}

export function createTourRecords(
  scope: TourScope,
  storage: () => TourStorage | undefined = browserStorage,
  memory: Map<string, TourStatus> = documentRecords,
) {
  const key = tourStorageKey(scope);
  const version = scope.version ?? 1;
  let failures = failedWrites.get(memory);
  if (failures === undefined) {
    failures = new Set();
    failedWrites.set(memory, failures);
  }
  const writes = failures;
  return {
    read(): TourStatus | undefined {
      try {
        const target = storage();
        if (target === undefined) return memory.get(key);
        const raw = target.getItem(key);
        if (writes.has(key)) return memory.get(key);
        let value: unknown;
        try {
          value = raw === null ? undefined : JSON.parse(raw);
        } catch {
          return undefined;
        }
        if (
          typeof value === "object" &&
          value !== null &&
          "version" in value &&
          value.version === version &&
          "status" in value &&
          (value.status === "completed" || value.status === "dismissed")
        )
          return value.status;
        return undefined;
      } catch {
        return memory.get(key);
      }
    },
    write(status: TourStatus) {
      memory.set(key, status);
      try {
        const target = storage();
        if (target === undefined) {
          writes.add(key);
          return;
        }
        target.setItem(key, JSON.stringify({ version, status }));
        writes.delete(key);
      } catch {
        writes.add(key);
        // Local onboarding preferences must never prevent editorial work.
      }
    },
  };
}
