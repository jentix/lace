import { ContentUseCases } from "@lacecms/application";
import type {
  Cache,
  Clock,
  IdGenerator,
  ObjectStorage,
  SiteBuildTrigger,
} from "@lacecms/application";
import {
  defineCollection,
  defineConfig,
  definePage,
  type ContentModelDefinition,
  type NormalizedConfig,
} from "@lacecms/config";
import { contentModelKey, unixMilliseconds } from "@lacecms/domain";
import {
  createLaceApp,
  type ActorResolver,
  type LaceAppInput,
  type ReadinessProbe,
  type RequestIdGenerator,
  type RequestRateLimiter,
  type ServerLogger,
} from "@lacecms/server";
import { ulid } from "ulid";
import { NodeContentRepository } from "./content-repository.js";
import { openNodeDatabase, type NodeDatabase } from "./index.js";

export type NodeEnvironment = Readonly<Record<string, string | undefined>>;

export interface NodeEnvironmentIssue {
  readonly reason: string;
  readonly variable: string;
}

/** Startup failures name variables but intentionally never repeat their values. */
export class NodeEnvironmentError extends Error {
  public constructor(readonly issues: readonly NodeEnvironmentIssue[]) {
    super(`Invalid Node environment: ${issues.map((issue) => issue.variable).join(", ")}.`);
    this.name = "NodeEnvironmentError";
  }
}

export interface NodeRuntimeSettings {
  readonly adminDevOrigin?: URL;
  readonly databasePath: string;
  readonly host: string;
  readonly port: number;
  readonly publicBaseUrl: URL;
  readonly siteDevOrigin?: URL;
}

function requiredString(
  environment: NodeEnvironment,
  variable: string,
  issues: NodeEnvironmentIssue[],
): string | undefined {
  const value = environment[variable];
  if (value === undefined || value.trim().length === 0) {
    issues.push({ reason: "missing", variable });
    return undefined;
  }
  return value;
}

function absoluteHttpUrl(
  value: string | undefined,
  variable: string,
  issues: NodeEnvironmentIssue[],
  options: { readonly originOnly: boolean },
): URL | undefined {
  if (value === undefined) return undefined;
  try {
    const parsed = new URL(value);
    const canonicalPath = parsed.pathname === "/" || parsed.pathname.endsWith("/");
    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      parsed.username.length > 0 ||
      parsed.password.length > 0 ||
      parsed.search.length > 0 ||
      parsed.hash.length > 0 ||
      !canonicalPath ||
      parsed.pathname.includes("//") ||
      (options.originOnly && parsed.pathname !== "/")
    ) {
      issues.push({ reason: "invalid", variable });
      return undefined;
    }
    return parsed;
  } catch {
    issues.push({ reason: "invalid", variable });
    return undefined;
  }
}

/** Parses all runtime settings once, without exposing supplied environment values in errors. */
export function parseNodeRuntimeSettings(environment: NodeEnvironment): NodeRuntimeSettings {
  const issues: NodeEnvironmentIssue[] = [];
  const databasePath = requiredString(environment, "LACE_DATABASE_PATH", issues);
  const publicBaseUrl = absoluteHttpUrl(
    requiredString(environment, "LACE_PUBLIC_BASE_URL", issues),
    "LACE_PUBLIC_BASE_URL",
    issues,
    { originOnly: false },
  );
  const host = environment.LACE_HOST ?? "127.0.0.1";
  if (host.trim().length === 0 || /\s/u.test(host))
    issues.push({ reason: "invalid", variable: "LACE_HOST" });
  const rawPort = environment.LACE_PORT ?? "3000";
  const port = Number(rawPort);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    issues.push({ reason: "invalid", variable: "LACE_PORT" });
  }
  const adminDevOrigin = absoluteHttpUrl(
    environment.LACE_ADMIN_DEV_ORIGIN,
    "LACE_ADMIN_DEV_ORIGIN",
    issues,
    { originOnly: true },
  );
  const siteDevOrigin = absoluteHttpUrl(
    environment.LACE_SITE_DEV_ORIGIN,
    "LACE_SITE_DEV_ORIGIN",
    issues,
    { originOnly: true },
  );
  if (issues.length > 0 || databasePath === undefined || publicBaseUrl === undefined) {
    throw new NodeEnvironmentError(Object.freeze(issues));
  }
  return Object.freeze({
    ...(adminDevOrigin === undefined ? {} : { adminDevOrigin }),
    databasePath,
    host,
    port,
    publicBaseUrl,
    ...(siteDevOrigin === undefined ? {} : { siteDevOrigin }),
  });
}

export class NoopNodeCache implements Cache {
  public async delete(_key: string): Promise<void> {}

  public async get<Value>(_key: string): Promise<Value | null> {
    return null;
  }

  public async set<Value>(_key: string, _value: Value): Promise<void> {}
}

export class NodeInfrastructureUnavailableError extends Error {
  public constructor() {
    super("Infrastructure capability is unavailable.");
    this.name = "NodeInfrastructureUnavailableError";
  }
}

/** Fails closed until the later object-storage adapter replaces this placeholder. */
export class NodePlaceholderObjectStorage implements ObjectStorage {
  public constructor(private readonly publicBaseUrl: URL) {}

  public async createReadUrl(key: string): Promise<string> {
    return new URL(`api/v1/public/media/${encodeURIComponent(key)}`, this.publicBaseUrl).href;
  }

  public async delete(_key: string): Promise<void> {
    throw new NodeInfrastructureUnavailableError();
  }

  public async get(): Promise<never> {
    throw new NodeInfrastructureUnavailableError();
  }

  public async put(): Promise<never> {
    throw new NodeInfrastructureUnavailableError();
  }
}

export class NoopNodeBuildTrigger implements SiteBuildTrigger {
  public async trigger(): Promise<{ readonly accepted: false }> {
    return { accepted: false };
  }
}

export class SystemNodeClock implements Clock {
  public now() {
    return unixMilliseconds(Date.now());
  }
}

export class UlidGenerator implements IdGenerator {
  public next(): string {
    return ulid();
  }
}

export class NodeSqliteReadiness implements ReadinessProbe {
  public constructor(private readonly connection: NodeDatabase["connection"]) {}

  public async isReady(): Promise<boolean> {
    try {
      this.connection.prepare("select 1").get();
      return true;
    } catch {
      return false;
    }
  }
}

export const anonymousActorResolver: ActorResolver = Object.freeze({
  resolve: async (): Promise<null> => null,
});

export const defaultNodeRequestIds: RequestIdGenerator = Object.freeze({ next: () => ulid() });
export const defaultNodeRateLimiter: RequestRateLimiter = Object.freeze({
  check: async () => true,
});
export const defaultNodeLogger: ServerLogger = Object.freeze({
  log: (entry: Parameters<ServerLogger["log"]>[0]) => console.info(JSON.stringify(entry)),
});

export interface CreateNodeRuntimeInput {
  readonly actors?: ActorResolver;
  readonly config: NormalizedConfig<readonly ContentModelDefinition[]>;
  readonly environment?: LaceAppInput["environment"];
  readonly logger?: ServerLogger;
  readonly maxBodyBytes?: number;
  readonly rateLimiter?: RequestRateLimiter;
  readonly requestIds?: RequestIdGenerator;
  readonly settings: NodeRuntimeSettings;
}

export interface NodeRuntime {
  readonly app: ReturnType<typeof createLaceApp>;
  readonly cache: Cache;
  readonly close: () => void;
  readonly content: ContentUseCases;
  readonly database: NodeDatabase;
  readonly readiness: ReadinessProbe;
  readonly repository: NodeContentRepository;
  readonly storage: ObjectStorage;
}

/** Small built-in config for the pre-generator local development command. */
export async function createNodeDevelopmentConfig() {
  return defineConfig({
    content: [
      definePage({ key: "home", path: "/", version: 1 }),
      defineCollection({ key: "posts", route: "/blog/:slug", version: 1 }),
    ],
  });
}

/** Creates the SQLite-backed Node composition without importing Node code into portable packages. */
export function createNodeRuntime(input: CreateNodeRuntimeInput): NodeRuntime {
  const database = openNodeDatabase(input.settings.databasePath);
  const ids = new UlidGenerator();
  const repository = new NodeContentRepository(
    database.connection,
    (key) => {
      const model = input.config.runtime.content.find((candidate) => candidate.key === key);
      if (model === undefined) return undefined;
      return model.kind === "page"
        ? { key: contentModelKey(model.key), kind: "page", path: model.path }
        : { key: contentModelKey(model.key), kind: "collection", route: model.route };
    },
    { nextId: () => ids.next() },
  );
  const clock = new SystemNodeClock();
  const cache = new NoopNodeCache();
  const storage = new NodePlaceholderObjectStorage(input.settings.publicBaseUrl);
  const buildTrigger = new NoopNodeBuildTrigger();
  const readiness = new NodeSqliteReadiness(database.connection);
  const content = new ContentUseCases({
    clock,
    config: input.config.runtime,
    content: repository,
    idGenerator: ids,
    media: repository,
    siteBuildTrigger: buildTrigger,
  });
  const app = createLaceApp({
    actors: input.actors ?? anonymousActorResolver,
    config: input.config,
    content,
    environment: input.environment ?? { engineVersion: "0.0.0", openApiTitle: "Lace API" },
    logger: input.logger ?? defaultNodeLogger,
    maxBodyBytes: input.maxBodyBytes ?? 1_048_576,
    publicContent: repository,
    rateLimiter: input.rateLimiter ?? defaultNodeRateLimiter,
    readiness,
    requestIds: input.requestIds ?? defaultNodeRequestIds,
  });
  return Object.freeze({
    app,
    cache,
    close: () => database.connection.close(),
    content,
    database,
    readiness,
    repository,
    storage,
  });
}

export function nodePublicMediaUrl(settings: NodeRuntimeSettings, key: string): string {
  return new URL(`api/v1/public/media/${encodeURIComponent(key)}`, settings.publicBaseUrl).href;
}
