import {
  adminSettingsStatusSchema,
  buildTokenCreatedSchema,
  buildTokenListSchema,
  buildTokenSchema,
  adminContentEntrySchema,
  contentEntryListSchema,
  contentModelListSchema,
  contractValidationIssueSchema,
  errorEnvelopeSchema,
  mediaListSchema,
  mediaMetadataSchema,
  managedUserListSchema,
  managedUserSchema,
  publishContentEntryResultSchema,
  type ContentBlockDto,
  type AdminSettingsStatusDto,
  type BuildTokenCreatedDto,
  type BuildTokenDto,
  type BuildTokenListDto,
  type ContractValidationIssue,
  type AdminContentEntryDto,
  type ContentEntrySortDto,
  type ContentEntryStatusDto,
  type ContentEntryListDto,
  type ContentModelListDto,
  type MediaListDto,
  type MediaMetadataDto,
  type ManagedUserDto,
  type ManagedUserListDto,
  type PublishContentEntryResultDto,
} from "@lacecms/contracts";
import * as v from "valibot";

export const adminQueryKeys = Object.freeze({
  settingsStatus: ["admin", "settings", "status"] as const,
  tokens: ["admin", "tokens"] as const,
  users: ["admin", "users"] as const,
  entry: (entryId: string) => ["admin", "entry", entryId] as const,
  entries: (modelKey: string, cursor?: string) =>
    ["admin", "entries", modelKey, cursor ?? null] as const,
  /** First-page summary (singleton and totals) shared by the shell and content overview. */
  entryOverview: (modelKey: string) => ["admin", "entries", modelKey, "overview"] as const,
  /** Invalidation prefix covering every entry query of one model. */
  modelEntries: (modelKey: string) => ["admin", "entries", modelKey] as const,
  media: (cursor?: string) => ["admin", "media", cursor ?? null] as const,
  models: ["admin", "models"] as const,
  session: ["admin", "session"] as const,
});

export class AdminClientError extends Error {
  readonly code: string | undefined;
  readonly requestId: string | undefined;
  readonly status: number | undefined;
  readonly issues: readonly ContractValidationIssue[] | undefined;

  constructor(input: {
    readonly code?: string;
    readonly message: string;
    readonly requestId?: string;
    readonly status?: number;
    readonly issues?: readonly ContractValidationIssue[];
  }) {
    super(input.message);
    this.name = "AdminClientError";
    this.code = input.code;
    this.requestId = input.requestId;
    this.status = input.status;
    this.issues = input.issues;
  }
}

export interface AdminClient {
  createUser(input: {
    email: string;
    password: string;
    role: "admin" | "editor" | "viewer";
  }): Promise<ManagedUserDto>;
  updateUser(
    userId: string,
    input: { disabled?: boolean; role?: "admin" | "editor" | "viewer" },
  ): Promise<ManagedUserDto>;
  listUsers(): Promise<ManagedUserListDto>;
  loadSettingsStatus(): Promise<AdminSettingsStatusDto>;
  listTokens(): Promise<BuildTokenListDto>;
  createToken(name: string): Promise<BuildTokenCreatedDto>;
  revokeToken(tokenId: string): Promise<BuildTokenDto>;
  createEntry(modelKey: string, title: string): Promise<AdminContentEntryDto>;
  deleteEntry(entryId: string, expectedRevision: number): Promise<void>;
  loadEntry(entryId: string): Promise<AdminContentEntryDto>;
  listEntries(
    modelKey: string,
    cursor?: string,
    query?: EntryListQuery,
  ): Promise<ContentEntryListDto>;
  listMedia(cursor?: string): Promise<MediaListDto>;
  uploadMedia(file: File): Promise<MediaMetadataDto>;
  deleteMedia(mediaId: string): Promise<MediaMetadataDto>;
  retryMediaDeletion(mediaId: string): Promise<MediaMetadataDto>;
  listModels(): Promise<ContentModelListDto>;
  publishEntry(
    entryId: string,
    input: { readonly expectedRevision: number; readonly idempotencyKey: string },
  ): Promise<PublishContentEntryResultDto>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  saveDraft(
    entryId: string,
    input: {
      readonly blocks: readonly ContentBlockDto[];
      readonly expectedRevision: number;
      readonly fields: Record<string, unknown>;
      readonly slug?: string;
      readonly title: string;
    },
  ): Promise<AdminContentEntryDto>;
}

/** Server-side search, status filter, and sort for an admin entry list. */
export interface EntryListQuery {
  readonly limit?: number;
  readonly q?: string;
  readonly sort?: ContentEntrySortDto;
  readonly status?: ContentEntryStatusDto;
}

type Fetcher = typeof fetch;

function responseError(response: Response, body: unknown): AdminClientError {
  const parsed = v.safeParse(errorEnvelopeSchema, body);
  const requestId = response.headers.get("x-request-id") ?? undefined;
  const issues = parsed.success ? parseIssues(parsed.output.error.details?.issues) : undefined;
  return parsed.success
    ? new AdminClientError({
        code: parsed.output.error.code,
        message: parsed.output.error.message,
        ...(requestId === undefined ? {} : { requestId }),
        status: response.status,
        ...(issues === undefined ? {} : { issues }),
      })
    : new AdminClientError({
        message: `The Lace API request failed (${response.status}).`,
        ...(requestId === undefined ? {} : { requestId }),
        status: response.status,
      });
}

function parseIssues(value: unknown): readonly ContractValidationIssue[] | undefined {
  const parsed = v.safeParse(v.array(contractValidationIssueSchema), value);
  return parsed.success ? parsed.output : undefined;
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
    createUser: async (input: Parameters<AdminClient["createUser"]>[0]) =>
      parse(
        managedUserSchema,
        await request(fetcher, "/api/v1/admin/users", {
          body: JSON.stringify(input),
          headers: { "content-type": "application/json" },
          method: "POST",
        }),
      ),
    updateUser: async (userId: string, input: Parameters<AdminClient["updateUser"]>[1]) =>
      parse(
        managedUserSchema,
        await request(fetcher, `/api/v1/admin/users/${encodeURIComponent(userId)}`, {
          body: JSON.stringify(input),
          headers: { "content-type": "application/json" },
          method: "PATCH",
        }),
      ),
    listUsers: async () =>
      parse(managedUserListSchema, await request(fetcher, "/api/v1/admin/users")),
    loadSettingsStatus: async () =>
      parse(adminSettingsStatusSchema, await request(fetcher, "/api/v1/admin/settings/status")),
    listTokens: async () =>
      parse(buildTokenListSchema, await request(fetcher, "/api/v1/admin/api-tokens")),
    createToken: async (name: string) =>
      parse(
        buildTokenCreatedSchema,
        await request(fetcher, "/api/v1/admin/api-tokens", {
          body: JSON.stringify({ name }),
          headers: { "content-type": "application/json" },
          method: "POST",
        }),
      ),
    revokeToken: async (tokenId: string) =>
      parse(
        buildTokenSchema,
        await request(fetcher, `/api/v1/admin/api-tokens/${encodeURIComponent(tokenId)}`, {
          method: "DELETE",
        }),
      ),
    createEntry: async (modelKey: string, title: string) =>
      parse(
        adminContentEntrySchema,
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
    loadEntry: async (entryId: string) =>
      parse(
        adminContentEntrySchema,
        await request(fetcher, `/api/v1/admin/entries/${encodeURIComponent(entryId)}`),
      ),
    listEntries: async (modelKey: string, cursor?: string, query: EntryListQuery = {}) => {
      const search = new URLSearchParams();
      if (cursor !== undefined) search.set("after", cursor);
      if (query.q !== undefined && query.q.trim().length > 0) search.set("q", query.q.trim());
      if (query.status !== undefined) search.set("status", query.status);
      if (query.sort !== undefined) search.set("sort", query.sort);
      if (query.limit !== undefined) search.set("limit", String(query.limit));
      const suffix = search.size === 0 ? "" : `?${search.toString()}`;
      return parse(
        contentEntryListSchema,
        await request(
          fetcher,
          `/api/v1/admin/models/${encodeURIComponent(modelKey)}/entries${suffix}`,
        ),
      );
    },
    listModels: async () =>
      parse(contentModelListSchema, await request(fetcher, "/api/v1/admin/content-models")),
    listMedia: async (cursor?: string) => {
      const query = cursor === undefined ? "" : `?after=${encodeURIComponent(cursor)}`;
      return parse(mediaListSchema, await request(fetcher, `/api/v1/admin/media${query}`));
    },
    uploadMedia: async (file: File) => {
      const body = new FormData();
      body.append("file", file);
      return parse(
        mediaMetadataSchema,
        await request(fetcher, "/api/v1/admin/media", { body, method: "POST" }),
      );
    },
    deleteMedia: async (mediaId: string) =>
      parse(
        mediaMetadataSchema,
        await request(fetcher, `/api/v1/admin/media/${encodeURIComponent(mediaId)}`, {
          method: "DELETE",
        }),
      ),
    retryMediaDeletion: async (mediaId: string) =>
      parse(
        mediaMetadataSchema,
        await request(
          fetcher,
          `/api/v1/admin/media/${encodeURIComponent(mediaId)}/retry-deletion`,
          {
            method: "POST",
          },
        ),
      ),
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
    publishEntry: async (
      entryId: string,
      input: { readonly expectedRevision: number; readonly idempotencyKey: string },
    ) =>
      parse(
        publishContentEntryResultSchema,
        await request(fetcher, `/api/v1/admin/entries/${encodeURIComponent(entryId)}/publish`, {
          body: JSON.stringify({ expectedRevision: input.expectedRevision }),
          headers: {
            "content-type": "application/json",
            "idempotency-key": input.idempotencyKey,
          },
          method: "POST",
        }),
      ),
    saveDraft: async (
      entryId: string,
      input: {
        readonly blocks: readonly ContentBlockDto[];
        readonly expectedRevision: number;
        readonly fields: Record<string, unknown>;
        readonly slug?: string;
        readonly title: string;
      },
    ) =>
      parse(
        adminContentEntrySchema,
        await request(fetcher, `/api/v1/admin/entries/${encodeURIComponent(entryId)}/draft`, {
          body: JSON.stringify(input),
          headers: { "content-type": "application/json" },
          method: "PUT",
        }),
      ),
  });
}

export function isSessionExpiredError(error: unknown): error is AdminClientError {
  return error instanceof AdminClientError && (error.status === 401 || error.status === 403);
}
