export type AdminRole = "admin" | "editor" | "viewer";

export interface AdminSession {
  readonly id: string;
  readonly role: AdminRole;
}

export interface AdminSessionSource {
  get(): Promise<AdminSession | null>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseSession(value: unknown): AdminSession | null {
  if (!isRecord(value) || !isRecord(value.user)) return null;
  const { id, role } = value.user;
  if (typeof id !== "string" || id.length === 0) return null;
  if (role !== "admin" && role !== "editor" && role !== "viewer") return null;
  return Object.freeze({ id, role });
}

/** Reads only the identity data required by route policy from the same-origin auth boundary. */
export function createBrowserSessionSource(fetcher: typeof fetch = fetch): AdminSessionSource {
  let pending: Promise<AdminSession | null> | undefined;
  return Object.freeze({
    get: () => {
      pending ??= fetcher("/api/auth/get-session", {
        credentials: "same-origin",
        headers: { accept: "application/json" },
      })
        .then(async (response) => (response.ok ? parseSession(await response.json()) : null))
        .catch(() => null);
      return pending;
    },
  });
}

export function createStaticSessionSource(session: AdminSession | null): AdminSessionSource {
  return Object.freeze({ get: async () => session });
}
