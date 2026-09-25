import { expect, test } from "vitest";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { hashPassword } from "better-auth/crypto";
import {
  listAppliedMigrations,
  migrateNodeDatabase,
  NodeInfrastructureUnavailableError,
  NodeMinioObjectStorage,
  NodeMediaDeletionDispatcher,
  NodeObjectStorageError,
  NodeContentRepository,
  NodeFixedWindowRateLimiter,
  NodeSecurityService,
  NodePlaceholderObjectStorage,
  NodeSqliteReadiness,
  NoopNodeBuildTrigger,
  NoopNodeCache,
  nodePublicMediaUrl,
  openNodeDatabase,
  packageName,
  parseNodeRuntimeSettings,
  createNodeRuntime,
} from "../dist/index.js";
import { defineCollection, defineConfig, definePage } from "@lacecms/config";
import {
  applyPreparedConfigurationSynchronization,
  prepareConfigurationSynchronization,
} from "@lacecms/application";
import { createBetterAuthBoundary } from "@lacecms/auth";
import { betterAuthSchema } from "@lacecms/db";
import {
  actorId,
  blockKey,
  contentEntryId,
  contentModelKey,
  contentSnapshotId,
  createContentEntry,
  mediaId,
  unixMilliseconds,
} from "@lacecms/domain";
import { dispatcherEventId, dispatcherLeaseId } from "@lacecms/application";

const minioEnvironment = Object.freeze({
  LACE_MINIO_ACCESS_KEY: "test-access-key",
  LACE_MINIO_BUCKET: "lace-media",
  LACE_MINIO_ENDPOINT: "http://minio.test:9000",
  LACE_MINIO_REGION: "us-east-1",
  LACE_MINIO_SECRET_KEY: "test-secret-key",
  LACE_MINIO_TIMEOUT_MS: "1000",
});

test("exports its package identity", () => expect(packageName).toBe("@lacecms/platform-node"));

test("claims media deletion work exclusively and finalizes or exposes terminal failure", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lace-outbox-"));
  const databasePath = join(directory, "lace.sqlite");
  try {
    migrateNodeDatabase(databasePath);
    const database = openNodeDatabase(databasePath);
    const repository = new NodeContentRepository(database.connection, () => undefined, {
      nextId: (() => {
        let value = 0;
        return () => `event-${++value}`;
      })(),
    });
    const insert = (id, attempts = 0) => {
      database.connection
        .prepare(
          "insert into media (id, storage_key, filename, mime_type, size, metadata_json, status, created_by, created_at, updated_at) values (?, ?, 'image.png', 'image/png', 1, '{}', 'deleting', 'admin', 1, 1)",
        )
        .run(id, `media/${id}`);
      database.connection
        .prepare(
          "insert into outbox_events (id, type, payload_json, attempts, available_at, created_at) values (?, 'media.delete.requested', ?, ?, 1, 1)",
        )
        .run(`outbox-${id}`, JSON.stringify({ mediaId: id }), attempts);
    };
    insert("media-success");
    const first = await repository.claim({
      eventTypes: ["media.delete.requested"],
      limit: 1,
      now: unixMilliseconds(1),
    });
    expect(first).toHaveLength(1);
    await expect(
      repository.claim({
        eventTypes: ["media.delete.requested"],
        limit: 1,
        now: unixMilliseconds(2),
      }),
    ).resolves.toEqual([]);
    await repository.completeMediaDeletion({
      completedAt: unixMilliseconds(2),
      leaseId: first[0].id,
      mediaId: mediaId("media-success"),
    });
    expect(database.connection.prepare("select count(*) as count from media").get()).toEqual({
      count: 0,
    });

    insert("media-terminal", 7);
    const terminal = await repository.claim({
      eventTypes: ["media.delete.requested"],
      limit: 1,
      now: unixMilliseconds(3),
    });
    await repository.failMediaDeletion({
      failedAt: unixMilliseconds(4),
      leaseId: terminal[0].id,
      mediaId: mediaId("media-terminal"),
      sanitizedError: "endpoint\nsecret",
      terminal: true,
    });
    expect(
      database.connection
        .prepare("select status, last_error from media where id = 'media-terminal'")
        .get(),
    ).toEqual({ last_error: "endpoint secret", status: "delete_failed" });
    await repository.retryDeletion({
      mediaId: mediaId("media-terminal"),
      requestedAt: unixMilliseconds(5),
      requestedBy: { id: actorId("admin"), role: "admin" },
    });
    expect(
      database.connection
        .prepare("select status, last_error from media where id = 'media-terminal'")
        .get(),
    ).toEqual({ last_error: null, status: "deleting" });
    database.connection.close();
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("dispatches media deletion with retry, terminal, and malformed-event boundaries", async () => {
  const completed = [];
  const failed = [];
  const deleted = [];
  let now = unixMilliseconds(1_000);
  const lease = (payload, attempts = 0) => ({
    event: {
      attempts,
      availableAt: now,
      id: dispatcherEventId(`event-${attempts}`),
      payload,
      type: "media.delete.requested",
    },
    expiresAt: unixMilliseconds(now + 60_000),
    id: dispatcherLeaseId(`lease-${attempts}`),
  });
  const work = {
    claim: async () => [lease({ mediaId: "media-1" })],
    complete: async (input) => completed.push(input),
    completeMediaDeletion: async (input) => completed.push(input),
    failMediaDeletion: async (input) => failed.push(input),
    loadDeletingMedia: async () => ({
      createdAt: now,
      createdBy: actorId("admin"),
      filename: "image.png",
      id: mediaId("media-1"),
      mimeType: "image/png",
      size: 1,
      status: "deleting",
      storageKey: "media/media-1",
      updatedAt: now,
    }),
    retry: async () => {},
  };
  const dispatcher = new NodeMediaDeletionDispatcher({
    clock: { now: () => now },
    logger: { error: () => {} },
    random: () => 0.5,
    storage: {
      createReadUrl: async () => "memory://object",
      delete: async (key) => deleted.push(key),
      get: async () => null,
      put: async () => ({ contentType: "image/png", key: "unused", size: 0 }),
    },
    work,
  });
  await dispatcher.runOnce();
  expect(deleted).toEqual(["media/media-1"]);
  expect(completed).toHaveLength(1);

  work.claim = async () => [lease({ mediaId: "media-1" }, 7)];
  dispatcher["options"].storage.delete = async () => {
    throw new Error("private storage detail");
  };
  await dispatcher.runOnce();
  expect(failed).toMatchObject([{ sanitizedError: "storage_unavailable", terminal: true }]);

  work.claim = async () => [lease({}, 0)];
  await dispatcher.runOnce();
  expect(completed).toHaveLength(2);
});

test("security service completes bootstrap once, protects its final admin, and revokes build tokens", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lace-security-"));
  const databasePath = join(directory, "lace.sqlite");
  try {
    migrateNodeDatabase(databasePath);
    const database = openNodeDatabase(databasePath);
    const now = 1_800_000_000_000;
    const security = new NodeSecurityService(database.connection, () => unixMilliseconds(now));
    const setup = await security.createSetupToken();
    const first = await security.bootstrap({
      email: "admin@lace.test",
      password: "correct horse battery staple",
      token: setup.token,
    });
    await expect(
      security.bootstrap({
        email: "other@lace.test",
        password: "correct horse battery staple",
        token: setup.token,
      }),
    ).rejects.toThrow();
    await expect(security.disableUser({ userId: first.user.id })).rejects.toThrow();
    const build = await security.createBuildToken({ name: "builder", now: unixMilliseconds(now) });
    await expect(
      security.verifyBuildToken({ now: unixMilliseconds(now), token: build.token }),
    ).resolves.toBe(true);
    await security.revokeBuildToken({ now: unixMilliseconds(now + 1), tokenId: build.id });
    await expect(
      security.verifyBuildToken({ now: unixMilliseconds(now + 2), token: build.token }),
    ).resolves.toBe(false);
    expect(
      database.connection.prepare("select token_hash from api_tokens").get(),
    ).not.toMatchObject({ token_hash: build.token });
    database.connection.close();
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("fixed-window buckets retain only HMAC identities and return a retry duration", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lace-limiter-"));
  const databasePath = join(directory, "lace.sqlite");
  try {
    migrateNodeDatabase(databasePath);
    const database = openNodeDatabase(databasePath);
    const limiter = new NodeFixedWindowRateLimiter(database.connection, "limiter-secret");
    for (let value = 0; value < 5; value += 1)
      await expect(
        limiter.check({
          now: unixMilliseconds(1_800_000_000_000),
          operation: "setup",
          subject: "raw@example.test",
        }),
      ).resolves.toMatchObject({ allowed: true });
    await expect(
      limiter.check({
        now: unixMilliseconds(1_800_000_000_000),
        operation: "setup",
        subject: "raw@example.test",
      }),
    ).resolves.toMatchObject({ allowed: false, retryAfterSeconds: 3600 });
    expect(
      database.connection.prepare("select bucket_key from rate_limit_buckets").get(),
    ).not.toMatchObject({ bucket_key: "raw@example.test" });
    database.connection.close();
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("validates named Node settings without disclosing supplied values", () => {
  const secret = "https://user:opaque-secret@invalid.test/path?token=opaque-secret";
  expect(() =>
    parseNodeRuntimeSettings({
      ...minioEnvironment,
      LACE_DATABASE_PATH: "",
      LACE_AUTH_SECRET: "test-auth-secret-that-is-long-enough-for-better-auth",
      LACE_PUBLIC_BASE_URL: secret,
      LACE_PORT: "not-a-port",
    }),
  ).toThrow("Invalid Node environment: LACE_DATABASE_PATH, LACE_PUBLIC_BASE_URL, LACE_PORT.");
  try {
    parseNodeRuntimeSettings({
      ...minioEnvironment,
      LACE_AUTH_SECRET: "test-auth-secret-that-is-long-enough-for-better-auth",
      LACE_DATABASE_PATH: "",
      LACE_PUBLIC_BASE_URL: secret,
    });
  } catch (error) {
    expect(String(error)).not.toContain("opaque-secret");
  }
  expect(
    parseNodeRuntimeSettings({
      ...minioEnvironment,
      LACE_ADMIN_DEV_ORIGIN: "http://127.0.0.1:5173",
      LACE_AUTH_SECRET: "test-auth-secret-that-is-long-enough-for-better-auth",
      LACE_DATABASE_PATH: "/tmp/lace.sqlite",
      LACE_PUBLIC_BASE_URL: "https://lace.test/base/",
      LACE_SITE_DEV_ORIGIN: "http://127.0.0.1:4321",
    }),
  ).toMatchObject({
    host: "127.0.0.1",
    port: 3000,
    publicBaseUrl: new URL("https://lace.test/base/"),
  });
  try {
    parseNodeRuntimeSettings({
      ...minioEnvironment,
      LACE_AUTH_SECRET: "test-auth-secret-that-is-long-enough-for-better-auth",
      LACE_DATABASE_PATH: "/tmp/lace.sqlite",
      LACE_MINIO_ENDPOINT: "https://user:opaque-minio-secret@minio.test/",
      LACE_PUBLIC_BASE_URL: "https://lace.test/",
    });
  } catch (error) {
    expect(String(error)).toContain("LACE_MINIO_ENDPOINT");
    expect(String(error)).not.toContain("opaque-minio-secret");
  }
});

test("uses configured public URLs and fails closed for placeholder infrastructure", async () => {
  const settings = parseNodeRuntimeSettings({
    ...minioEnvironment,
    LACE_DATABASE_PATH: "/tmp/lace.sqlite",
    LACE_AUTH_SECRET: "test-auth-secret-that-is-long-enough-for-better-auth",
    LACE_PUBLIC_BASE_URL: "https://lace.test/base/",
  });
  expect(nodePublicMediaUrl(settings, "media/one")).toBe(
    "https://lace.test/base/api/v1/public/media/media%2Fone",
  );
  const storage = new NodePlaceholderObjectStorage(settings.publicBaseUrl);
  await expect(storage.createReadUrl("media/one")).resolves.toBe(
    "https://lace.test/base/api/v1/public/media/media%2Fone",
  );
  await expect(storage.get("media/one")).rejects.toBeInstanceOf(NodeInfrastructureUnavailableError);
  const cache = new NoopNodeCache();
  await cache.set("derived", { value: 1 });
  await expect(cache.get("derived")).resolves.toBeNull();
  await expect(new NoopNodeBuildTrigger().trigger({})).resolves.toEqual({ accepted: false });
});

test("MinIO storage streams objects, distinguishes missing keys, and sanitizes failures", async () => {
  const commands = [];
  const client = {
    send: async (command, options) => {
      commands.push({ command, options });
      if (command.constructor.name === "GetObjectCommand") {
        return { Body: Readable.from([Buffer.from("media-bytes")]) };
      }
      if (command.constructor.name === "PutObjectCommand") {
        expect(command.input.Body).toEqual(Buffer.from([1, 2, 3]));
        expect(command.input.ContentLength).toBe(3);
      }
      return {};
    },
  };
  const storage = new NodeMinioObjectStorage(
    {
      accessKeyId: "test-access-key",
      bucket: "lace-media",
      endpoint: new URL("http://minio.test:9000"),
      publicBaseUrl: new URL("https://lace.test/base/"),
      region: "us-east-1",
      secretAccessKey: "test-secret-key",
      timeoutMs: 100,
    },
    client,
  );
  await storage.assertReady();
  const stored = await storage.put({
    body: {
      async *[Symbol.asyncIterator]() {
        yield new Uint8Array([1, 2]);
        yield new Uint8Array([3]);
      },
    },
    contentType: "image/png",
    key: "media/example",
  });
  expect(stored).toEqual({ contentType: "image/png", key: "media/example", size: 3 });
  expect(await storage.createReadUrl("media/example")).toBe(
    "https://lace.test/base/api/v1/public/media/example",
  );
  await expect(
    (async () => {
      const output = await storage.get("media/example");
      return output === null ? undefined : Buffer.concat(await Array.fromAsync(output));
    })(),
  ).resolves.toEqual(Buffer.from("media-bytes"));
  await storage.delete("media/example");
  expect(commands.map(({ command }) => command.constructor.name)).toEqual([
    "HeadBucketCommand",
    "PutObjectCommand",
    "GetObjectCommand",
    "DeleteObjectCommand",
  ]);
  expect(commands.every(({ options }) => options.abortSignal instanceof AbortSignal)).toBe(true);

  const missing = new NodeMinioObjectStorage(
    {
      accessKeyId: "test-access-key",
      bucket: "lace-media",
      endpoint: new URL("http://minio.test:9000"),
      publicBaseUrl: new URL("https://lace.test/"),
      region: "us-east-1",
      secretAccessKey: "test-secret-key",
      timeoutMs: 100,
    },
    { send: async () => Promise.reject({ name: "NoSuchKey" }) },
  );
  await expect(missing.get("missing")).resolves.toBeNull();
  const unavailable = new NodeMinioObjectStorage(
    {
      accessKeyId: "test-access-key",
      bucket: "lace-media",
      endpoint: new URL("http://minio.test:9000"),
      publicBaseUrl: new URL("https://lace.test/"),
      region: "us-east-1",
      secretAccessKey: "test-secret-key",
      timeoutMs: 100,
    },
    { send: async () => Promise.reject(new Error("opaque infrastructure detail")) },
  );
  await expect(unavailable.assertReady()).rejects.toBeInstanceOf(NodeObjectStorageError);
});

test("reports cheap SQLite readiness failures after the connection closes", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lace-readiness-"));
  const databasePath = join(directory, "lace.sqlite");
  try {
    migrateNodeDatabase(databasePath);
    const database = openNodeDatabase(databasePath);
    const readiness = new NodeSqliteReadiness(database.connection);
    await expect(readiness.isReady()).resolves.toBe(true);
    database.connection.close();
    await expect(readiness.isReady()).resolves.toBe(false);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("Node composition maps a Better Auth session into a protected actor", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lace-node-auth-"));
  const databasePath = join(directory, "lace.sqlite");
  try {
    migrateNodeDatabase(databasePath);
    const settings = parseNodeRuntimeSettings({
      ...minioEnvironment,
      LACE_AUTH_SECRET: "test-auth-secret-that-is-long-enough-for-better-auth",
      LACE_DATABASE_PATH: databasePath,
      LACE_PUBLIC_BASE_URL: "https://lace.test/",
    });
    const config = await defineConfig({
      content: [
        definePage({ key: "home", path: "/", version: 1 }),
        defineCollection({ key: "posts", route: "/blog/:slug", version: 1 }),
      ],
    });
    const runtime = createNodeRuntime({ config, settings });
    const now = Date.now();
    runtime.database.connection
      .prepare(
        "insert into user (id, name, email, email_verified, role, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)",
      )
      .run("node-auth-user", "Node Auth", "node-auth@lace.test", 1, "viewer", now, now);
    runtime.database.connection
      .prepare(
        "insert into account (id, account_id, provider_id, user_id, password, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        "node-auth-account",
        "node-auth-user",
        "credential",
        "node-auth-user",
        await hashPassword("correct horse battery staple"),
        now,
        now,
      );
    const signIn = await runtime.app.fetch(
      new Request("https://lace.test/api/auth/sign-in/email", {
        body: JSON.stringify({
          email: "node-auth@lace.test",
          password: "correct horse battery staple",
        }),
        headers: { "content-type": "application/json", origin: "https://lace.test" },
        method: "POST",
      }),
    );
    expect(signIn.status).toBe(200);
    const cookie = signIn.headers.getSetCookie()[0].split(";")[0];
    expect(
      (
        await runtime.app.fetch(
          new Request("https://lace.test/api/v1/admin/content-models", { headers: { cookie } }),
        )
      ).status,
    ).toBe(200);
    runtime.close();
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("Better Auth rejects public enrollment and applies same-origin session policy", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lace-auth-policy-"));
  const databasePath = join(directory, "lace.sqlite");
  try {
    migrateNodeDatabase(databasePath);
    const database = openNodeDatabase(databasePath);
    const boundary = createBetterAuthBoundary({
      database: database.drizzle,
      origin: new URL("https://lace.test/"),
      production: true,
      schema: betterAuthSchema,
      secret: "test-auth-secret-that-is-long-enough-for-better-auth",
    });
    const signUp = await boundary.fetch(
      new Request("https://lace.test/api/auth/sign-up/email", {
        body: JSON.stringify({
          email: "new@lace.test",
          name: "New",
          password: "correct horse battery staple",
        }),
        headers: { "content-type": "application/json", origin: "https://lace.test" },
        method: "POST",
      }),
    );
    expect(signUp.status).toBeGreaterThanOrEqual(400);
    expect(database.connection.prepare("select count(*) as count from user").get()).toEqual({
      count: 0,
    });
    const now = Date.now();
    database.connection
      .prepare(
        "insert into user (id, name, email, email_verified, created_at, updated_at) values (?, ?, ?, ?, ?, ?)",
      )
      .run("auth-user", "Auth User", "auth@lace.test", 1, now, now);
    expect(
      database.connection.prepare("select role from user where id = ?").get("auth-user"),
    ).toEqual({
      role: "viewer",
    });
    expect(() =>
      database.connection
        .prepare(
          "insert into user (id, name, email, email_verified, role, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)",
        )
        .run("bad-role", "Bad", "bad@lace.test", 0, "owner", now, now),
    ).toThrow();
    database.connection
      .prepare(
        "insert into account (id, account_id, provider_id, user_id, password, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        "auth-account",
        "auth-user",
        "credential",
        "auth-user",
        await hashPassword("correct horse battery staple"),
        now,
        now,
      );
    const crossOrigin = await boundary.fetch(
      new Request("https://lace.test/api/auth/sign-in/email", {
        body: JSON.stringify({ email: "auth@lace.test", password: "correct horse battery staple" }),
        headers: { "content-type": "application/json", origin: "https://attacker.test" },
        method: "POST",
      }),
    );
    expect(crossOrigin.status).toBeGreaterThanOrEqual(400);
    const signIn = await boundary.fetch(
      new Request("https://lace.test/api/auth/sign-in/email", {
        body: JSON.stringify({ email: "auth@lace.test", password: "correct horse battery staple" }),
        headers: { "content-type": "application/json", origin: "https://lace.test" },
        method: "POST",
      }),
    );
    const cookie = signIn.headers.getSetCookie()[0].split(";")[0];
    expect(signIn.status).toBe(200);
    expect(signIn.headers.get("set-cookie")).toContain("Secure");
    await expect(
      boundary.actors.resolve(
        new Request("https://lace.test/api/v1/admin/content-models", { headers: { cookie } }),
      ),
    ).resolves.toEqual({ id: "auth-user", role: "viewer" });
    database.connection.prepare("update session set expires_at = ?").run(Date.now() - 1);
    await expect(
      boundary.actors.resolve(
        new Request("https://lace.test/api/v1/admin/content-models", { headers: { cookie } }),
      ),
    ).resolves.toBeNull();
    database.connection.close();
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

function syncClock(value) {
  return { now: () => unixMilliseconds(value) };
}

function syncIds(prefix) {
  let value = 0;
  return { next: () => `${prefix}-${++value}` };
}

function syncPage(overrides = {}) {
  return {
    fields: {},
    key: "home",
    kind: "page",
    path: "/",
    projectionHash: "projection-home",
    structureHash: "structure-home",
    version: 1,
    ...overrides,
  };
}

function syncCollection(overrides = {}) {
  return {
    fields: {},
    key: "posts",
    kind: "collection",
    projectionHash: "projection-posts",
    route: "/blog/:slug",
    structureHash: "structure-posts",
    version: 1,
    ...overrides,
  };
}

function syncResolver(models) {
  const values = new Map(models.map((model) => [model.key, model]));
  return (key) => {
    const model = values.get(key);
    if (model === undefined) return undefined;
    return model.kind === "page"
      ? { key: contentModelKey(model.key), kind: "page", path: model.path }
      : { key: contentModelKey(model.key), kind: "collection", route: model.route };
  };
}

test("applies guarded configuration sync atomically, coalesces build work, and rejects stale plans", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lace-sync-"));
  const databasePath = join(directory, "lace.sqlite");
  try {
    migrateNodeDatabase(databasePath);
    const database = openNodeDatabase(databasePath);
    const models = [syncPage(), syncCollection()];
    const repository = new NodeContentRepository(database.connection, syncResolver(models), {
      nextId: syncIds("outbox").next,
    });
    const prepared = await prepareConfigurationSynchronization({ models, state: repository });
    await expect(
      applyPreparedConfigurationSynchronization({
        clock: syncClock(10),
        ids: syncIds("sync"),
        models,
        prepared,
        target: repository,
      }),
    ).resolves.toMatchObject({ status: "applied", targetVersion: 1 });
    expect(await repository.readConfigurationSyncState()).toMatchObject([
      { entryCount: 1, key: "home" },
      { entryCount: 0, key: "posts" },
    ]);
    await expect(
      repository.list({ limit: 1, modelKey: contentModelKey("home") }),
    ).resolves.toMatchObject({
      items: [{ title: "home" }],
    });
    expect(database.connection.prepare("select version from published_state").get()).toEqual({
      version: 1,
    });
    expect(
      database.connection.prepare("select count(*) as count from outbox_events").get(),
    ).toEqual({ count: 1 });

    const repeated = await prepareConfigurationSynchronization({ models, state: repository });
    await expect(
      applyPreparedConfigurationSynchronization({
        clock: syncClock(11),
        ids: syncIds("repeat"),
        models,
        prepared: repeated,
        target: repository,
      }),
    ).resolves.toMatchObject({ status: "noop" });
    expect(database.connection.prepare("select version from published_state").get()).toEqual({
      version: 1,
    });

    const projectionUpdate = [syncPage(), syncCollection({ projectionHash: "projection-posts-2" })];
    const updated = await prepareConfigurationSynchronization({
      models: projectionUpdate,
      state: repository,
    });
    await expect(
      applyPreparedConfigurationSynchronization({
        clock: syncClock(12),
        ids: syncIds("update"),
        models: projectionUpdate,
        prepared: updated,
        target: repository,
      }),
    ).resolves.toMatchObject({ status: "applied", targetVersion: 2 });
    expect(database.connection.prepare("select version from published_state").get()).toEqual({
      version: 2,
    });
    expect(
      database.connection.prepare("select count(*) as count from outbox_events").get(),
    ).toEqual({ count: 1 });

    const stale = await prepareConfigurationSynchronization({
      models: projectionUpdate,
      state: repository,
    });
    database.connection
      .prepare("update content_models set projection_hash = ? where key = ?")
      .run("changed-concurrently", "posts");
    await expect(
      applyPreparedConfigurationSynchronization({
        clock: syncClock(13),
        ids: syncIds("stale"),
        models: projectionUpdate,
        prepared: stale,
        target: repository,
      }),
    ).rejects.toMatchObject({ code: "CONTENT_INVALID_STATE" });
    expect(database.connection.prepare("select version from published_state").get()).toEqual({
      version: 2,
    });
    database.connection.close();
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("rolls back a failed synchronized page singleton", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lace-sync-rollback-"));
  const databasePath = join(directory, "lace.sqlite");
  try {
    migrateNodeDatabase(databasePath);
    const database = openNodeDatabase(databasePath);
    const models = [syncPage({ label: "Home" })];
    const repository = new NodeContentRepository(database.connection, syncResolver(models), {
      beforeMutation: (checkpoint) => {
        if (checkpoint === "sync.page.snapshot") throw new Error("injected failure");
      },
    });
    const prepared = await prepareConfigurationSynchronization({ models, state: repository });
    await expect(
      applyPreparedConfigurationSynchronization({
        clock: syncClock(10),
        ids: syncIds("rollback"),
        models,
        prepared,
        target: repository,
      }),
    ).rejects.toMatchObject({ code: "CONTENT_INVALID_STATE" });
    expect(await repository.readConfigurationSyncState()).toEqual([]);
    expect(
      database.connection.prepare("select count(*) as count from published_state").get(),
    ).toEqual({ count: 0 });
    expect(
      database.connection.prepare("select count(*) as count from outbox_events").get(),
    ).toEqual({ count: 0 });
    database.connection.close();
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("renames a populated model through the key cascade without inferring a replacement", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lace-sync-rename-"));
  const databasePath = join(directory, "lace.sqlite");
  try {
    migrateNodeDatabase(databasePath);
    const database = openNodeDatabase(databasePath);
    const posts = syncCollection();
    const repository = new NodeContentRepository(database.connection, syncResolver([posts]));
    const initial = await prepareConfigurationSynchronization({
      models: [posts],
      state: repository,
    });
    await applyPreparedConfigurationSynchronization({
      clock: syncClock(10),
      ids: syncIds("initial"),
      models: [posts],
      prepared: initial,
      target: repository,
    });
    await repository.create({
      entry: createContentEntry({
        id: contentEntryId("post-entry"),
        model: { key: contentModelKey("posts"), kind: "collection", route: "/blog/:slug" },
        draft: {
          blocks: [],
          createdAt: unixMilliseconds(11),
          entryId: contentEntryId("post-entry"),
          fields: {},
          id: contentSnapshotId("post-draft"),
          revision: 1,
          state: "draft",
          title: "Post",
          updatedAt: unixMilliseconds(11),
          updatedBy: { id: actorId("editor"), role: "editor" },
        },
      }),
      mediaReferences: [],
    });
    const articles = syncCollection({ key: "articles", renamedFrom: "posts" });
    const rename = await prepareConfigurationSynchronization({
      models: [articles],
      state: repository,
    });
    await expect(
      applyPreparedConfigurationSynchronization({
        clock: syncClock(12),
        ids: syncIds("rename"),
        models: [articles],
        prepared: rename,
        target: repository,
      }),
    ).resolves.toMatchObject({ status: "applied" });
    expect(database.connection.prepare("select key from content_models").get()).toEqual({
      key: "articles",
    });
    expect(database.connection.prepare("select model_key from content_entries").get()).toEqual({
      model_key: "articles",
    });
    database.connection.close();
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("allows only one independently prepared SQLite sync apply to commit", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lace-sync-concurrent-"));
  const databasePath = join(directory, "lace.sqlite");
  try {
    migrateNodeDatabase(databasePath);
    const firstDatabase = openNodeDatabase(databasePath);
    const secondDatabase = openNodeDatabase(databasePath);
    const models = [syncCollection()];
    const first = new NodeContentRepository(firstDatabase.connection, syncResolver(models));
    const second = new NodeContentRepository(secondDatabase.connection, syncResolver(models));
    const [firstPrepared, secondPrepared] = await Promise.all([
      prepareConfigurationSynchronization({ models, state: first }),
      prepareConfigurationSynchronization({ models, state: second }),
    ]);
    await expect(
      applyPreparedConfigurationSynchronization({
        clock: syncClock(10),
        ids: syncIds("first"),
        models,
        prepared: firstPrepared,
        target: first,
      }),
    ).resolves.toMatchObject({ status: "applied" });
    await expect(
      applyPreparedConfigurationSynchronization({
        clock: syncClock(11),
        ids: syncIds("second"),
        models,
        prepared: secondPrepared,
        target: second,
      }),
    ).rejects.toMatchObject({ code: "CONTENT_INVALID_STATE" });
    expect(
      firstDatabase.connection.prepare("select count(*) as count from content_models").get(),
    ).toEqual({
      count: 1,
    });
    expect(
      firstDatabase.connection.prepare("select count(*) as count from outbox_events").get(),
    ).toEqual({
      count: 1,
    });
    firstDatabase.connection.close();
    secondDatabase.connection.close();
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("migrates an empty file, reopens with SQLite invariants, and enforces constraints", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lace-schema-"));
  const databasePath = join(directory, "lace.sqlite");
  try {
    expect(migrateNodeDatabase(databasePath)).toHaveLength(2);
    const database = openNodeDatabase(databasePath);
    try {
      expect(database.connection.pragma("foreign_keys", { simple: true })).toBe(1);
      expect(database.connection.pragma("journal_mode", { simple: true })).toBe("wal");
      expect(listAppliedMigrations(database.connection)).toHaveLength(2);

      const tableNames = database.connection
        .prepare("select name from sqlite_master where type = 'table'")
        .all()
        .map(({ name }) => name);
      expect(tableNames).toEqual(
        expect.arrayContaining([
          "content_models",
          "content_entries",
          "content_snapshots",
          "outbox_events",
          "installation_state",
          "user",
        ]),
      );
      const indexNames = database.connection
        .prepare("select name from sqlite_master where type = 'index'")
        .all()
        .map(({ name }) => name);
      expect(indexNames).toEqual(
        expect.arrayContaining([
          "content_entries_singleton_idx",
          "content_entries_list_idx",
          "content_blocks_snapshot_position_idx",
          "content_media_references_media_idx",
          "outbox_events_available_idx",
          "site_builds_history_idx",
        ]),
      );
      const queryPlan = (sql, ...bindings) =>
        database.connection.prepare(`explain query plan ${sql}`).all(...bindings);
      expect(
        queryPlan("select * from content_blocks where snapshot_id = ? order by position", "x"),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            detail: expect.stringContaining("content_blocks_snapshot_position_idx"),
          }),
        ]),
      );
      expect(queryPlan("select * from content_media_references where media_id = ?", "x")).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            detail: expect.stringContaining("content_media_references_media_idx"),
          }),
        ]),
      );
      expect(
        queryPlan(
          "select * from content_entries where model_key = ? order by updated_at desc, id desc",
          "home",
        ),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ detail: expect.stringContaining("content_entries_list_idx") }),
        ]),
      );
      expect(
        queryPlan(
          "select * from outbox_events where processed_at is null and locked_at is null and available_at <= ?",
          1,
        ),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            detail: expect.stringContaining("outbox_events_available_idx"),
          }),
        ]),
      );

      const insertModel = database.connection.prepare(
        "insert into content_models values (?, ?, ?, ?, ?, ?, ?, ?)",
      );
      insertModel.run("home", "page", "Home", 1, "structure", "projection", 1, 1);
      expect(() =>
        insertModel.run("invalid", "unsupported", "Invalid", 1, "structure", "projection", 1, 1),
      ).toThrow();
      const insertEntry = database.connection.prepare(
        "insert into content_entries (id, model_key, singleton_key, created_by, created_at, updated_at) values (?, ?, ?, ?, ?, ?)",
      );
      insertEntry.run("home-1", "home", 1, "admin", 1, 1);
      expect(() => insertEntry.run("home-2", "home", 1, "admin", 1, 1)).toThrow();
      expect(() =>
        database.connection
          .prepare("insert into content_blocks values (?, ?, ?, ?, ?, ?, ?, ?)")
          .run("missing", "block", "hero", 1000, 1, "{}", 1, 1),
      ).toThrow();

      expect(() =>
        database.connection
          .prepare(
            "insert into media (id, storage_key, filename, mime_type, size, metadata_json, status, created_by, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          )
          .run(
            "invalid-media",
            "object-invalid",
            "image.png",
            "image/png",
            1,
            "{}",
            "missing",
            "admin",
            1,
            1,
          ),
      ).toThrow();
      expect(() =>
        database.connection.prepare("insert into published_state values (?, ?, ?)").run(2, 0, 1),
      ).toThrow();
      expect(() =>
        database.connection
          .prepare(
            "insert into site_builds (id, reason, status, target_version, requested_by, requested_at) values (?, ?, ?, ?, ?, ?)",
          )
          .run("invalid-build", "manual", "unknown", 0, "admin", 1),
      ).toThrow();

      insertModel.run("posts", "collection", "Posts", 1, "structure", "projection", 1, 1);
      insertEntry.run("post-1", "posts", null, "admin", 1, 1);
      insertEntry.run("post-2", "posts", null, "admin", 1, 1);
      const insertSnapshot = database.connection.prepare(
        "insert into content_snapshots values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      );
      insertSnapshot.run("post-1-draft", "post-1", 1, null, "First", "{}", 1, 1, 1, "admin");
      insertSnapshot.run("post-2-draft", "post-2", 1, null, "Second", "{}", 1, 1, 1, "admin");
      database.connection
        .prepare("update content_entries set draft_snapshot_id = ? where id = ?")
        .run("post-1-draft", "post-1");
      database.connection
        .prepare("insert into published_routes values (?, ?, ?, ?)")
        .run("/posts/first", "post-1", "post-1-draft", 1);
      expect(() =>
        database.connection
          .prepare("insert into published_routes values (?, ?, ?, ?)")
          .run("/posts/first", "post-2", "post-2-draft", 1),
      ).toThrow();
      const insertIdempotency = database.connection.prepare(
        "insert into idempotency_records values (?, ?, ?, ?, ?, ?)",
      );
      insertIdempotency.run("publication:post-1", "request-1", "hash", "{}", 1, 2);
      expect(() =>
        insertIdempotency.run("publication:post-1", "request-1", "different", "{}", 1, 2),
      ).toThrow();

      database.connection
        .prepare(
          "insert into media (id, storage_key, filename, mime_type, size, metadata_json, status, created_by, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .run("media-1", "object-1", "image.png", "image/png", 1, "{}", "active", "admin", 1, 1);
      database.connection
        .prepare("insert into content_media_references values (?, ?, ?, ?, ?)")
        .run("post-1-draft", "$fields", "image", "media-1", 1);
      expect(() =>
        database.connection.prepare("delete from media where id = ?").run("media-1"),
      ).toThrow();

      database.connection
        .prepare("update content_models set key = ? where key = ?")
        .run("articles", "posts");
      expect(
        database.connection
          .prepare("select model_key from content_entries where id = ?")
          .get("post-1"),
      ).toEqual({ model_key: "articles" });
      expect(() =>
        database.connection.prepare("delete from content_models where key = ?").run("articles"),
      ).toThrow();

      database.connection.prepare("delete from content_snapshots where id = ?").run("post-1-draft");
      expect(
        database.connection
          .prepare("select draft_snapshot_id from content_entries where id = ?")
          .get("post-1"),
      ).toEqual({ draft_snapshot_id: null });
      expect(
        database.connection.prepare("select count(*) as count from content_media_references").get(),
      ).toEqual({ count: 0 });
      database.connection.prepare("delete from media where id = ?").run("media-1");

      database.connection
        .prepare("insert into content_blocks values (?, ?, ?, ?, ?, ?, ?, ?)")
        .run("post-2-draft", "block-1", "hero", 1000, 1, "{}", 1, 1);
      database.connection.prepare("delete from content_entries where id = ?").run("post-2");
      expect(
        database.connection.prepare("select count(*) as count from content_blocks").get(),
      ).toEqual({
        count: 0,
      });
    } finally {
      database.connection.close();
    }

    const migrationFile = (await readdir(new URL("../../db/drizzle", import.meta.url))).find(
      (file) => file.endsWith(".sql"),
    );
    expect(migrationFile).toBeDefined();
    const migrationSql = await readFile(
      new URL(`../../db/drizzle/${migrationFile}`, import.meta.url),
      "utf8",
    );
    expect(migrationSql).not.toContain("journal_mode");
    expect(migrationSql).not.toContain("foreign_keys = ON");
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

const editor = { id: actorId("editor"), role: "editor" };
const routes = new Map([
  ["posts", { key: contentModelKey("posts"), kind: "collection", route: "/blog/:slug" }],
  ["home", { key: contentModelKey("home"), kind: "page", path: "/" }],
]);

function draftEntry(id, modelKey, updatedAt, title = id) {
  const entryId = contentEntryId(id);
  return createContentEntry({
    id: entryId,
    model: routes.get(modelKey),
    draft: {
      blocks: [
        {
          data: { image: "media-1", title },
          key: blockKey(`${id}-block`),
          position: 1000,
          schemaVersion: 1,
          type: "hero",
        },
      ],
      createdAt: unixMilliseconds(updatedAt),
      entryId,
      fields: { image: "media-1", title },
      id: contentSnapshotId(`${id}-draft`),
      revision: 1,
      slug: id,
      state: "draft",
      title,
      updatedAt: unixMilliseconds(updatedAt),
      updatedBy: editor,
    },
  });
}

function references(blockKeyValue) {
  return [
    { fieldPath: "image", mediaId: mediaId("media-1"), sourceKey: "$fields" },
    { fieldPath: "image", mediaId: mediaId("media-1"), sourceKey: blockKey(blockKeyValue) },
  ];
}

test("persists bounded Node draft reads and writes without exposing drafts publicly", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lace-repository-"));
  const databasePath = join(directory, "lace.sqlite");
  try {
    migrateNodeDatabase(databasePath);
    const database = openNodeDatabase(databasePath);
    try {
      database.connection
        .prepare("insert into content_models values (?, ?, ?, ?, ?, ?, ?, ?)")
        .run("posts", "collection", "Posts", 1, "structure", "projection", 1, 1);
      database.connection
        .prepare("insert into content_models values (?, ?, ?, ?, ?, ?, ?, ?)")
        .run("home", "page", "Home", 1, "structure", "projection", 1, 1);
      database.connection
        .prepare(
          "insert into media (id, storage_key, filename, mime_type, size, metadata_json, status, created_by, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .run("media-1", "object-1", "image.png", "image/png", 1, "{}", "active", "editor", 1, 1);
      const repository = new NodeContentRepository(database.connection, (key) => routes.get(key));

      const first = draftEntry("post-a", "posts", 20, "First");
      const second = draftEntry("post-b", "posts", 20, "Second");
      await repository.create({ entry: first, mediaReferences: references("post-a-block") });
      await repository.create({ entry: second, mediaReferences: references("post-b-block") });
      const firstPage = await repository.list({ limit: 1, modelKey: contentModelKey("posts") });
      expect(firstPage.items.map((item) => item.id)).toEqual(["post-b"]);
      const secondPage = await repository.list({
        after: firstPage.nextCursor,
        limit: 1,
        modelKey: contentModelKey("posts"),
      });
      expect(secondPage.items.map((item) => item.id)).toEqual(["post-a"]);
      await expect(
        repository.list({ after: "not-a-cursor", limit: 1, modelKey: contentModelKey("posts") }),
      ).rejects.toMatchObject({ code: "CONTENT_INVALID_STATE" });

      await repository.saveCompleteDraft({
        entryId: first.id,
        mutation: {
          blocks: [
            {
              data: { image: "media-1", title: "Saved" },
              key: blockKey("saved-block"),
              position: 1000,
              schemaVersion: 1,
              type: "hero",
            },
          ],
          expectedRevision: 1,
          fields: { image: "media-1", title: "Saved" },
          mediaReferences: references("saved-block"),
          slug: "post-a",
          title: "Saved",
          updatedAt: unixMilliseconds(30),
          updatedBy: editor,
        },
      });
      expect((await repository.load({ entryId: first.id })).draft).toMatchObject({
        revision: 2,
        title: "Saved",
        blocks: [{ key: "saved-block" }],
      });
      expect(
        database.connection
          .prepare("select count(*) as count from content_media_references where snapshot_id = ?")
          .get("post-a-draft"),
      ).toEqual({ count: 2 });
      await expect(
        repository.saveCompleteDraft({
          entryId: first.id,
          mutation: {
            blocks: [],
            expectedRevision: 1,
            fields: {},
            mediaReferences: [],
            title: "Stale",
            updatedAt: unixMilliseconds(31),
            updatedBy: editor,
          },
        }),
      ).rejects.toMatchObject({ code: "CONTENT_REVISION_CONFLICT" });
      expect((await repository.load({ entryId: first.id })).draft.title).toBe("Saved");
      await expect(
        repository.saveCompleteDraft({
          entryId: first.id,
          mutation: {
            blocks: [],
            expectedRevision: 2,
            fields: { title: "Broken" },
            mediaReferences: [
              { fieldPath: "image", mediaId: mediaId("missing-media"), sourceKey: "$fields" },
            ],
            title: "Broken",
            updatedAt: unixMilliseconds(32),
            updatedBy: editor,
          },
        }),
      ).rejects.toMatchObject({ code: "CONTENT_INVALID_STATE" });
      expect((await repository.load({ entryId: first.id })).draft).toMatchObject({
        revision: 2,
        title: "Saved",
        blocks: [{ key: "saved-block" }],
      });

      await repository.create({
        entry: draftEntry("home-a", "home", 21),
        mediaReferences: references("home-a-block"),
      });
      await expect(
        repository.create({
          entry: draftEntry("home-b", "home", 22),
          mediaReferences: references("home-b-block"),
        }),
      ).rejects.toMatchObject({ code: "CONTENT_MODEL_CARDINALITY_CONFLICT" });
      expect(await repository.load({ entryId: contentEntryId("home-b") })).toBeNull();

      await repository.publish({
        entryId: first.id,
        expectedRevision: 2,
        publishedAt: unixMilliseconds(40),
        publishedBy: editor,
        publishedSnapshotId: contentSnapshotId("post-a-published"),
      });
      database.connection
        .prepare(
          "insert into content_snapshots (id, entry_id, revision, slug, title, fields_json, schema_version, created_at, updated_at, updated_by) select ?, entry_id, revision, slug, title, fields_json, schema_version, ?, ?, updated_by from content_snapshots where id = ?",
        )
        .run("post-b-published", 41, 41, "post-b-draft");
      database.connection
        .prepare(
          "insert into content_blocks (snapshot_id, block_key, block_type, position, schema_version, data_json, created_at, updated_at) select ?, block_key, block_type, position, schema_version, data_json, created_at, updated_at from content_blocks where snapshot_id = ?",
        )
        .run("post-b-published", "post-b-draft");
      database.connection
        .prepare("update content_entries set published_snapshot_id = ? where id = ?")
        .run("post-b-published", "post-b");
      database.connection
        .prepare(
          "insert into published_routes (path, entry_id, snapshot_id, updated_at) values (?, ?, ?, ?)",
        )
        .run("/blog/post-b", "post-b", "post-b-published", 41);
      expect(await repository.loadPublic("/blog/post-a")).toMatchObject({
        entry: { id: "post-a", published: { id: "post-a-published" } },
      });
      expect(
        await repository.listPublic({ limit: 1, modelKey: contentModelKey("posts") }),
      ).toMatchObject({ items: [{ path: "/blog/post-b" }] });
      expect(await repository.publishedContentVersion()).toBe(1);
      expect((await repository.loadPublicMedia("media-1"))?.id).toBe("media-1");
      const prepare = database.connection.prepare.bind(database.connection);
      let queryCount = 0;
      database.connection.prepare = (...arguments_) => {
        queryCount += 1;
        return prepare(...arguments_);
      };
      expect(await repository.exportBuildContent()).toMatchObject({
        version: 1,
        entries: [{ path: "/blog/post-a" }, { path: "/blog/post-b" }],
      });
      expect(queryCount).toBeLessThanOrEqual(4);
      expect(await repository.loadPublic("/missing")).toBeNull();
      database.connection
        .prepare("update content_snapshots set fields_json = ? where id = ?")
        .run("not-json", "post-b-published");
      await expect(repository.loadPublic("/blog/post-b")).rejects.toMatchObject({
        code: "CONTENT_INVALID_STATE",
      });
    } finally {
      database.connection.close();
    }
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("guards Node deletions by draft revision and publication identity", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lace-delete-guard-"));
  const databasePath = join(directory, "lace.sqlite");
  try {
    migrateNodeDatabase(databasePath);
    const database = openNodeDatabase(databasePath);
    try {
      database.connection
        .prepare("insert into content_models values (?, ?, ?, ?, ?, ?, ?, ?)")
        .run("posts", "collection", "Posts", 1, "structure", "projection", 1, 1);
      const repository = new NodeContentRepository(database.connection, (key) => routes.get(key));
      const post = draftEntry("guarded-post", "posts", 20, "Guarded");
      await repository.create({ entry: post, mediaReferences: [] });

      await expect(
        repository.delete({
          deletedAt: unixMilliseconds(21),
          deletedBy: editor,
          entryId: post.id,
          expectedRevision: 0,
        }),
      ).rejects.toMatchObject({ code: "CONTENT_REVISION_CONFLICT" });
      expect(await repository.load({ entryId: post.id })).not.toBeNull();

      await repository.publish({
        entryId: post.id,
        expectedRevision: 1,
        publishedAt: unixMilliseconds(22),
        publishedBy: editor,
        publishedSnapshotId: contentSnapshotId("guarded-post-published"),
      });
      const version = (await repository.exportBuildContent()).version;
      await expect(
        repository.delete({
          deletedAt: unixMilliseconds(23),
          deletedBy: editor,
          entryId: post.id,
          expectedRevision: 1,
        }),
      ).rejects.toMatchObject({ code: "CONTENT_REVISION_CONFLICT" });
      expect((await repository.exportBuildContent()).version).toBe(version);
      expect(await repository.loadPublic("/blog/guarded-post")).not.toBeNull();

      await expect(
        repository.delete({
          deletedAt: unixMilliseconds(24),
          deletedBy: editor,
          entryId: post.id,
          expectedPublishedSnapshotId: contentSnapshotId("guarded-post-published"),
          expectedRevision: 1,
        }),
      ).resolves.toMatchObject({ status: "deleted" });
      expect(await repository.load({ entryId: post.id })).toBeNull();
    } finally {
      database.connection.close();
    }
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});
