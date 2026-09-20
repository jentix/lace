import {
  contentEntryListSchema,
  contentEntrySchema,
  contentModelListSchema,
  errorEnvelopeSchema,
  type ContentEntryDto,
  type ContentEntryListDto,
  type ContentModelListDto,
} from "@lacecms/contracts";
import * as v from "valibot";

export const adminQueryKeys = Object.freeze({
  entries: (modelKey: string, cursor?: string) =>
    ["admin", "entries", modelKey, cursor ?? null] as const,
  models: ["admin", "models"] as const,
  session: ["admin", "session"] as const,
});

export class AdminClientError extends Error {
  readonly code: string | undefined;
  readonly requestId: string | undefined;
  readonly status: number | undefined;

  constructor(input: {
    readonly code?: string;
    readonly message: string;
    readonly requestId?: string;
    readonly status?: number;
  }) {
    super(input.message);
    this.name = "AdminClientError";
    this.code = input.code;
    this.requestId = input.requestId;
    this.status = input.status;
  }
}

export interface AdminClient {
  createEntry(modelKey: string, title: string): Promise<ContentEntryDto>;
  deleteEntry(entryId: string, expectedRevision: number): Promise<void>;
  listEntries(modelKey: string, cursor?: string): Promise<ContentEntryListDto>;
  listModels(): Promise<ContentModelListDto>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

type Fetcher = typeof fetch;

function responseError(response: Response, body: unknown): AdminClientError {
  const parsed = v.safeParse(errorEnvelopeSchema, body);
  const requestId = response.headers.get("x-request-id") ?? undefined;
  return parsed.success
    ? new AdminClientError({
        code: parsed.output.error.code,
        message: parsed.output.error.message,
        ...(requestId === undefined ? {} : { requestId }),
        status: response.status,
      })
    : new AdminClientError({
        message: `The Lace API request failed (${response.status}).`,
        ...(requestId === undefined ? {} : { requestId }),
        status: response.status,
      });
}

async function json(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

async function request(fetcher: Fetcher, path: string, init: RequestInit = {}): Promise<unknown> {
  let response: Response;
  try {
    response = await fetcher(path, {
      ...init,
      credentials: "same-origin",
      headers: { accept: "application/json", ...init.headers },
    });
  } catch {
    throw new AdminClientError({ message: "The Lace API could not be reached." });
  }
  const body = response.status === 204 ? undefined : await json(response);
  if (!response.ok) throw responseError(response, body);
  return body;
}

function parse<T>(schema: v.BaseSchema<unknown, T, v.BaseIssue<unknown>>, body: unknown): T {
  const result = v.safeParse(schema, body);
  if (!result.success)
    throw new AdminClientError({ message: "The Lace API returned an invalid response." });
  return result.output;
}

/** Creates the credentialed browser client for the shared admin REST contracts. */
export function createAdminClient(fetcher: Fetcher = fetch): AdminClient {
  return Object.freeze({
    createEntry: async (modelKey: string, title: string) =>
      parse(
        contentEntrySchema,
        await request(fetcher, `/api/v1/admin/models/${encodeURIComponent(modelKey)}/entries`, {
          body: JSON.stringify({ blocks: [], fields: {}, title }),
          headers: { "content-type": "application/json" },
          method: "POST",
        }),
      ),
    deleteEntry: async (entryId: string, expectedRevision: number) => {
      await request(fetcher, `/api/v1/admin/entries/${encodeURIComponent(entryId)}`, {
        body: JSON.stringify({ expectedRevision }),
        headers: { "content-type": "application/json" },
        method: "DELETE",
      });
    },
    listEntries: async (modelKey: string, cursor?: string) => {
      const query = cursor === undefined ? "" : `?cursor=${encodeURIComponent(cursor)}`;
      return parse(
        contentEntryListSchema,
        await request(
          fetcher,
          `/api/v1/admin/models/${encodeURIComponent(modelKey)}/entries${query}`,
        ),
      );
    },
    listModels: async () =>
      parse(contentModelListSchema, await request(fetcher, "/api/v1/admin/content-models")),
    signIn: async (email: string, password: string) => {
      await request(fetcher, "/api/auth/sign-in/email", {
        body: JSON.stringify({ email, password }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
    },
    signOut: async () => {
      await request(fetcher, "/api/auth/sign-out", { method: "POST" });
    },
  });
}

export function isSessionExpiredError(error: unknown): error is AdminClientError {
  return error instanceof AdminClientError && (error.status === 401 || error.status === 403);
}
