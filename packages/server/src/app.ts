import { ContentUseCases, opaqueCursor } from "@lacecms/application";
import type { PublicContentReadPort } from "@lacecms/application";
import {
  buildExportSchema,
  classifyError,
  contentEntryListSchema,
  contentEntrySchema,
  contentModelListSchema,
  createContentEntryRequestSchema,
  deleteContentEntryRequestSchema,
  entityTagForVersion,
  entityTagSchema,
  errorEnvelopeSchema,
  idempotencyKeySchema,
  identifierSchemaPublic,
  opaqueCursorSchema,
  publicContentEntrySchema,
  publicContentListSchema,
  publishContentEntryRequestSchema,
  resolveExpectedRevision,
  saveDraftRequestSchema,
  toBuildExportDto,
  toContentEntryDto,
  toContentModelDto,
  toIsoTimestamp,
  transportError,
  validationError,
  versionFromEntityTag,
} from "@lacecms/contracts";
import type { ClassifiedError, ContractValidationIssue } from "@lacecms/contracts";
import { toJsonSchema } from "@valibot/to-json-schema";
import { bodyLimit } from "hono/body-limit";
import { Hono } from "hono";
import { describeRoute, loadVendor, openAPIRouteHandler, resolver, validator } from "hono-openapi";
import * as v from "valibot";

loadVendor("valibot", { toJSONSchema: toJsonSchema as never });

declare module "hono" {
  interface ContextVariableMap {
    "lace.actor": Actor | undefined;
    "lace.requestId": string;
  }
}

interface ServerModelBase {
  readonly blocks: readonly string[];
  readonly description?: string;
  readonly fields: unknown;
  readonly key: string;
  readonly label?: string;
  readonly version: number;
}

type ServerContentModel =
  | (ServerModelBase & { readonly kind: "collection"; readonly route: string })
  | (ServerModelBase & { readonly kind: "page"; readonly path: string });

interface ServerConfig {
  readonly content: readonly ServerContentModel[];
}
type ServerSchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;
type Actor = Parameters<ContentUseCases["create"]>[0]["actor"];

export interface ActorResolver {
  resolve(request: Request): Promise<Actor | null>;
}

export interface AuthRouteHandler {
  fetch(request: Request): Promise<Response>;
}

export interface RequestIdGenerator {
  next(): string;
}

export interface RequestRateLimiter {
  check(input: { readonly request: Request; readonly requestId: string }): Promise<boolean>;
}

export interface ServerLogger {
  log(entry: {
    readonly actorId?: string;
    readonly durationMs: number;
    readonly method: string;
    readonly path: string;
    readonly requestId: string;
    readonly status: number;
  }): void;
}

export interface ReadinessProbe {
  isReady(): Promise<boolean>;
}

export interface ServerEnvironmentMetadata {
  readonly engineVersion: string;
  readonly openApiTitle: string;
}

export interface BuiltAdminResponder {
  fetch(request: Request): Promise<Response>;
}

export interface LaceAppInput {
  readonly auth?: AuthRouteHandler;
  readonly actors: ActorResolver;
  readonly adminAssets?: BuiltAdminResponder;
  readonly config: ServerConfig;
  readonly content: ContentUseCases;
  readonly environment: ServerEnvironmentMetadata;
  readonly logger: ServerLogger;
  readonly maxBodyBytes: number;
  readonly publicContent: PublicContentReadPort;
  readonly rateLimiter: RequestRateLimiter;
  readonly readiness: ReadinessProbe;
  readonly requestIds: RequestIdGenerator;
}

class RequestValidationError extends Error {
  public constructor(readonly issues: readonly ContractValidationIssue[]) {
    super("Request validation failed.");
  }
}

class AuthorizationError extends Error {}

function pointer(path: readonly unknown[] | undefined): string {
  if (path === undefined || path.length === 0) return "";
  return path
    .map((part) =>
      typeof part === "object" && part !== null && "key" in part
        ? (part as { readonly key: unknown }).key
        : part,
    )
    .map((part) => String(part).replaceAll("~", "~0").replaceAll("/", "~1"))
    .map((part) => `/${part}`)
    .join("");
}

function standardIssues(
  issues: readonly { readonly path?: readonly unknown[] | undefined }[],
): ContractValidationIssue[] {
  return issues.map((issue) => ({
    code: "invalid_value",
    message: "The submitted value is invalid.",
    path: pointer(issue.path),
  }));
}

function invalid(message = "The submitted value is invalid.", path = ""): never {
  throw new RequestValidationError([{ code: "invalid_value", message, path }]);
}

function parse<Schema extends ServerSchema>(schema: Schema, value: unknown): v.InferOutput<Schema> {
  const result = v.safeParse(schema, value);
  if (!result.success) {
    throw new RequestValidationError(
      result.issues.map((issue) => ({
        code: issue.type,
        message: "The submitted value is invalid.",
        path: pointer(issue.path as readonly unknown[] | undefined),
      })),
    );
  }
  return result.output;
}

function response<Schema extends ServerSchema>(
  schema: Schema,
  value: unknown,
  status = 200,
  headers?: HeadersInit,
): Response {
  return Response.json(parse(schema, value), {
    ...(headers === undefined ? {} : { headers }),
    status,
  });
}

function errorResponse(error: ClassifiedError): Response {
  return response(errorEnvelopeSchema, error.body, error.status);
}

function notFound(): Response {
  return errorResponse(transportError("NOT_FOUND"));
}

function validationResponse(issues: readonly ContractValidationIssue[]): Response {
  return errorResponse(validationError(issues));
}

function contentModel(config: ServerConfig, key: string): ServerContentModel | undefined {
  return config.content.find((model) => model.key === key);
}

function pageModel(
  config: ServerConfig,
  key: string,
): Extract<ServerContentModel, { readonly kind: "page" }> | undefined {
  const model = contentModel(config, key);
  return model?.kind === "page" ? model : undefined;
}

function collectionModel(
  config: ServerConfig,
  key: string,
): Extract<ServerContentModel, { readonly kind: "collection" }> | undefined {
  const model = contentModel(config, key);
  return model?.kind === "collection" ? model : undefined;
}

function pagination(request: Request): {
  readonly after?: ReturnType<typeof opaqueCursor>;
  readonly limit: number;
} {
  const url = new URL(request.url);
  const after = url.searchParams.get("after") ?? undefined;
  const limit = url.searchParams.get("limit") ?? "50";
  const parsedLimit = Number(limit);
  if (!Number.isSafeInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100)
    invalid("limit must be an integer between 1 and 100.", "/limit");
  if (after === undefined) return { limit: parsedLimit };
  parse(opaqueCursorSchema, after);
  return { after: opaqueCursor(after), limit: parsedLimit };
}

async function optionalJsonBody(request: Request): Promise<unknown> {
  if (request.headers.get("content-length") === "0") return {};
  try {
    return await request.json();
  } catch {
    if (request.headers.get("content-length") === null) return {};
    invalid("The request body must contain valid JSON.");
  }
}

function revision(
  body: { readonly expectedRevision?: number | undefined },
  request: Request,
): number {
  try {
    const ifMatch = request.headers.get("if-match") ?? undefined;
    return resolveExpectedRevision({
      ...(body.expectedRevision === undefined ? {} : { expectedRevision: body.expectedRevision }),
      ...(ifMatch === undefined ? {} : { ifMatch }),
    });
  } catch {
    return invalid("expectedRevision and If-Match must supply one matching revision.");
  }
}

function optionalIdempotencyKey(request: Request): string | undefined {
  const value = request.headers.get("idempotency-key") ?? undefined;
  return value === undefined ? undefined : parse(idempotencyKeySchema, value);
}

function modelDto(model: ServerContentModel) {
  return toContentModelDto({
    blocks: model.blocks,
    ...(model.description === undefined ? {} : { description: model.description }),
    fields: model.fields as never,
    key: model.key,
    kind: model.kind,
    ...(model.label === undefined ? {} : { label: model.label }),
    ...(model.kind === "page" ? { path: model.path } : { route: model.route }),
    version: model.version,
  });
}

function publicPath(value: string): string {
  if (
    !value.startsWith("/") ||
    value.includes("?") ||
    value.includes("#") ||
    value.includes("\\") ||
    value.includes("//") ||
    /\s/u.test(value) ||
    (value.length > 1 && value.endsWith("/"))
  ) {
    invalid("The submitted value is invalid.", "/path");
  }
  return value;
}

const modelKeyParams = v.strictObject({ modelKey: identifierSchemaPublic });
const entryIdParams = v.strictObject({ entryId: identifierSchemaPublic });
const collectionItemParams = v.strictObject({
  modelKey: identifierSchemaPublic,
  slug: identifierSchemaPublic,
});

const validationHook = ((result: {
  readonly success: boolean;
  readonly error?: readonly { readonly path?: readonly unknown[] | undefined }[] | undefined;
}) => {
  if (!result.success) return validationResponse(standardIssues(result.error ?? []));
}) as never;

/** Creates a portable Hono API app; runtime adapters supply every infrastructure capability. */
export function createLaceApp(input: LaceAppInput): Hono {
  if (!Number.isSafeInteger(input.maxBodyBytes) || input.maxBodyBytes < 1)
    throw new TypeError("maxBodyBytes must be a positive safe integer.");
  const app = new Hono();

  app.onError((error) =>
    error instanceof RequestValidationError
      ? validationResponse(error.issues)
      : error instanceof AuthorizationError
        ? errorResponse(transportError("AUTHORIZATION_DENIED"))
        : errorResponse(classifyError(error)),
  );

  app.use(async (context, next) => {
    const requestId = input.requestIds.next();
    context.set("lace.requestId", requestId);
    const startedAt = performance.now();
    try {
      await next();
    } finally {
      context.res.headers.set("x-request-id", requestId);
      const actor = context.get("lace.actor") as Actor | undefined;
      input.logger.log({
        ...(actor === undefined ? {} : { actorId: actor.id }),
        durationMs: performance.now() - startedAt,
        method: context.req.method,
        path: context.req.path,
        requestId,
        status: context.res.status,
      });
    }
  });

  if (input.auth !== undefined) {
    const auth = input.auth;
    app.all("/api/auth/*", (context) => auth.fetch(context.req.raw));
  }

  app.use(
    bodyLimit({
      maxSize: input.maxBodyBytes,
      onError: () => errorResponse(transportError("PAYLOAD_TOO_LARGE")),
    }),
  );
  app.use(async (context, next) => {
    const allowed = await input.rateLimiter.check({
      request: context.req.raw,
      requestId: context.get("lace.requestId") as string,
    });
    if (!allowed) return errorResponse(transportError("RATE_LIMITED"));
    await next();
  });

  async function actor(context: {
    readonly req: { readonly raw: Request };
    get(key: string): unknown;
    set(key: string, value: unknown): void;
  }): Promise<Actor> {
    const cached = context.get("lace.actor") as Actor | undefined;
    if (cached !== undefined) return cached;
    const resolved = await input.actors.resolve(context.req.raw);
    if (resolved === null) throw new AuthorizationError();
    context.set("lace.actor", resolved);
    return resolved;
  }

  app.get("/health/live", (context) => context.json({ status: "live" }));
  app.get("/health/ready", async (context) => {
    const ready = await input.readiness.isReady();
    return context.json({ status: ready ? "ready" : "not_ready" }, ready ? 200 : 503);
  });

  app.get(
    "/api/v1/admin/content-models",
    describeRoute({
      responses: {
        200: {
          content: { "application/json": { schema: resolver(contentModelListSchema) } },
          description: "Content models",
        },
      },
      summary: "List content models",
      tags: ["admin"],
    }),
    async (context) => {
      await actor(context);
      return response(contentModelListSchema, { items: input.config.content.map(modelDto) });
    },
  );

  app.get(
    "/api/v1/admin/models/:modelKey/entries",
    describeRoute({ summary: "List content entries", tags: ["admin"] }),
    validator("param", modelKeyParams, validationHook),
    async (context) => {
      const modelKey = context.req.param("modelKey");
      if (contentModel(input.config, modelKey) === undefined) return notFound();
      const page = await input.content.list({
        actor: await actor(context),
        modelKey,
        ...pagination(context.req.raw),
      });
      return response(contentEntryListSchema, {
        items: page.items.map((entry) => ({
          draftRevision: entry.draftRevision,
          id: entry.id,
          modelKey: entry.modelKey,
          ...(entry.publishedSnapshotId === undefined
            ? {}
            : { publishedSnapshotId: entry.publishedSnapshotId }),
          title: entry.title,
          updatedAt: toIsoTimestamp(entry.updatedAt),
        })),
        ...(page.nextCursor === undefined ? {} : { nextCursor: page.nextCursor }),
      });
    },
  );

  app.post(
    "/api/v1/admin/models/:modelKey/entries",
    describeRoute({
      requestBody: {
        content: { "application/json": { schema: resolver(createContentEntryRequestSchema) } },
      },
      responses: {
        201: {
          content: { "application/json": { schema: resolver(contentEntrySchema) } },
          description: "Created entry",
        },
      },
      summary: "Create content entry",
      tags: ["admin"],
    }),
    validator("param", modelKeyParams, validationHook),
    validator("json", createContentEntryRequestSchema, validationHook),
    async (context) => {
      const modelKey = context.req.param("modelKey");
      if (contentModel(input.config, modelKey) === undefined) return notFound();
      const body = context.req.valid("json") as v.InferOutput<
        typeof createContentEntryRequestSchema
      >;
      const { blocks, fields, slug, title } = body;
      const entry = await input.content.create({
        actor: await actor(context),
        modelKey,
        blocks: blocks.map((block) => ({ ...block, key: block.key as never })),
        fields,
        ...(slug === undefined ? {} : { slug }),
        title,
      });
      return response(contentEntrySchema, toContentEntryDto(entry), 201);
    },
  );

  app.get(
    "/api/v1/admin/entries/:entryId",
    describeRoute({ summary: "Load content entry", tags: ["admin"] }),
    validator("param", entryIdParams, validationHook),
    async (context) => {
      const entry = await input.content.load({
        actor: await actor(context),
        entryId: context.req.param("entryId") as never,
      });
      return entry === null ? notFound() : response(contentEntrySchema, toContentEntryDto(entry));
    },
  );

  app.put(
    "/api/v1/admin/entries/:entryId/draft",
    describeRoute({
      requestBody: {
        content: { "application/json": { schema: resolver(saveDraftRequestSchema) } },
      },
      summary: "Save complete draft",
      tags: ["admin"],
    }),
    validator("param", entryIdParams, validationHook),
    validator("json", saveDraftRequestSchema, validationHook),
    async (context) => {
      const body = context.req.valid("json") as v.InferOutput<typeof saveDraftRequestSchema>;
      const entry = await input.content.save({
        actor: await actor(context),
        blocks: body.blocks.map((block) => ({ ...block, key: block.key as never })),
        entryId: context.req.param("entryId") as never,
        expectedRevision: revision(body, context.req.raw),
        fields: body.fields,
        ...(body.slug === undefined ? {} : { slug: body.slug }),
        title: body.title,
      });
      return response(contentEntrySchema, toContentEntryDto(entry));
    },
  );

  app.post(
    "/api/v1/admin/entries/:entryId/publish",
    describeRoute({
      requestBody: {
        content: { "application/json": { schema: resolver(publishContentEntryRequestSchema) } },
      },
      summary: "Publish content entry",
      tags: ["admin"],
    }),
    validator("param", entryIdParams, validationHook),
    validator("json", publishContentEntryRequestSchema, validationHook),
    async (context) => {
      const body = context.req.valid("json") as v.InferOutput<
        typeof publishContentEntryRequestSchema
      >;
      const idempotencyKey = optionalIdempotencyKey(context.req.raw);
      const published = await input.content.publish({
        actor: await actor(context),
        entryId: context.req.param("entryId") as never,
        expectedRevision: revision(body, context.req.raw),
        ...(idempotencyKey === undefined ? {} : { idempotencyKey }),
      });
      return response(contentEntrySchema, toContentEntryDto(published.entry));
    },
  );

  app.delete(
    "/api/v1/admin/entries/:entryId",
    describeRoute({ summary: "Delete content entry", tags: ["admin"] }),
    validator("param", entryIdParams, validationHook),
    async (context) => {
      const body = parse(deleteContentEntryRequestSchema, await optionalJsonBody(context.req.raw));
      await input.content.delete({
        actor: await actor(context),
        entryId: context.req.param("entryId") as never,
        expectedRevision: revision(body, context.req.raw),
      });
      return new Response(null, { status: 204 });
    },
  );

  app.get(
    "/api/v1/public/pages/:modelKey",
    describeRoute({ summary: "Read a published page", tags: ["public"] }),
    validator("param", modelKeyParams, validationHook),
    async (context) => {
      const model = pageModel(input.config, context.req.param("modelKey"));
      if (model === undefined) return notFound();
      const entry = await input.publicContent.loadPublic(model.path);
      return entry === null
        ? notFound()
        : response(publicContentEntrySchema, {
            entry: toContentEntryDto(entry.entry),
            path: entry.path,
          });
    },
  );

  app.get(
    "/api/v1/public/collections/:modelKey",
    describeRoute({ summary: "List published collection entries", tags: ["public"] }),
    validator("param", modelKeyParams, validationHook),
    async (context) => {
      const model = collectionModel(input.config, context.req.param("modelKey"));
      if (model === undefined) return notFound();
      const page = await input.publicContent.listPublic({
        modelKey: model.key as never,
        ...pagination(context.req.raw),
      });
      return response(publicContentListSchema, {
        items: page.items.map(({ entry, path }) => ({ entry: toContentEntryDto(entry), path })),
        ...(page.nextCursor === undefined ? {} : { nextCursor: page.nextCursor }),
      });
    },
  );

  app.get(
    "/api/v1/public/collections/:modelKey/:slug",
    describeRoute({ summary: "Read a published collection entry", tags: ["public"] }),
    validator("param", collectionItemParams, validationHook),
    async (context) => {
      const model = collectionModel(input.config, context.req.param("modelKey"));
      if (model === undefined) return notFound();
      let path: string;
      try {
        const slug = context.req.param("slug");
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug))
          invalid("The submitted value is invalid.", "/slug");
        path = model.route.replace(":slug", slug);
      } catch {
        return validationResponse([
          { code: "invalid_value", message: "The submitted value is invalid.", path: "/slug" },
        ]);
      }
      const entry = await input.publicContent.loadPublic(path);
      return entry === null
        ? notFound()
        : response(publicContentEntrySchema, {
            entry: toContentEntryDto(entry.entry),
            path: entry.path,
          });
    },
  );

  app.get(
    "/api/v1/public/content/by-path",
    describeRoute({ summary: "Read published content by path", tags: ["public"] }),
    async (context) => {
      const suppliedPath = new URL(context.req.raw.url).searchParams.get("path");
      if (suppliedPath === null)
        return validationResponse([
          { code: "invalid_value", message: "The submitted value is invalid.", path: "/path" },
        ]);
      let path: string;
      try {
        path = publicPath(suppliedPath);
      } catch {
        return validationResponse([
          { code: "invalid_value", message: "The submitted value is invalid.", path: "/path" },
        ]);
      }
      const entry = await input.publicContent.loadPublic(path);
      return entry === null
        ? notFound()
        : response(publicContentEntrySchema, {
            entry: toContentEntryDto(entry.entry),
            path: entry.path,
          });
    },
  );

  app.get(
    "/api/v1/public/build-export",
    describeRoute({
      responses: {
        200: {
          content: { "application/json": { schema: resolver(buildExportSchema) } },
          description: "Published build export",
        },
      },
      summary: "Read published build export",
      tags: ["public"],
    }),
    async (context) => {
      const version = await input.publicContent.publishedContentVersion();
      const etag = entityTagForVersion(version);
      const suppliedTag = context.req.header("if-none-match") ?? undefined;
      if (suppliedTag !== undefined) {
        try {
          parse(entityTagSchema, suppliedTag);
        } catch (error) {
          if (error instanceof RequestValidationError) return validationResponse(error.issues);
          throw error;
        }
        if (versionFromEntityTag(suppliedTag) === version)
          return new Response(null, { headers: { etag }, status: 304 });
      }
      const buildExport = await input.publicContent.exportBuildContent();
      return response(buildExportSchema, toBuildExportDto(buildExport), 200, { etag });
    },
  );

  app.get(
    "/api/v1/openapi.json",
    openAPIRouteHandler(app, {
      documentation: {
        info: { title: input.environment.openApiTitle, version: input.environment.engineVersion },
        openapi: "3.1.0",
      },
    }),
  );

  app.notFound(async (context) => {
    if (
      input.adminAssets !== undefined &&
      !context.req.path.startsWith("/api/") &&
      context.req.path !== "/health/live" &&
      context.req.path !== "/health/ready"
    )
      return input.adminAssets.fetch(context.req.raw);
    return notFound();
  });

  return app;
}
