export type AdminRole = "admin" | "editor" | "viewer";

export interface AdminSession {
  /** Presentation-only name for the shell; never used for route policy. */
  readonly displayName?: string;
  readonly id: string;
  readonly role: AdminRole;
}

export interface AdminSessionSource {
  get(): Promise<AdminSession | null>;
  invalidate(): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function nonEmpty(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function parseSession(value: unknown): AdminSession | null {
  if (!isRecord(value) || !isRecord(value.user)) return null;
  const { email, id, name, role } = value.user;
  if (typeof id !== "string" || id.length === 0) return null;
  if (role !== "admin" && role !== "editor" && role !== "viewer") return null;
  const displayName = nonEmpty(name) ?? nonEmpty(email);
  return Object.freeze({ ...(displayName === undefined ? {} : { displayName }), id, role });
}

/** Reads route-policy identity and a display name from the same-origin auth boundary. */
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
    invalidate: () => {
      pending = undefined;
    },
  });
}

export function createStaticSessionSource(session: AdminSession | null): AdminSessionSource {
  return Object.freeze({ get: async () => session, invalidate: () => undefined });
}
