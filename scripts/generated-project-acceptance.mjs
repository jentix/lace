import { spawn } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const timeoutMs = 5 * 60_000;
const secretValues = new Set();
const temporaryPaths = [];
let composeProject;
let composeCwd;
if (process.env.LACE_ACCEPTANCE_SECRET_SENTINEL) {
  secretValues.add(process.env.LACE_ACCEPTANCE_SECRET_SENTINEL);
}

function sanitize(value) {
  let result = String(value);
  for (const secret of secretValues) {
    if (secret.length > 0) result = result.replaceAll(secret, "[REDACTED]");
  }
  return result;
}

async function run(stage, command, args, options = {}) {
  console.info(`Acceptance: ${stage}`);
  if (process.env.LACE_ACCEPTANCE_FAIL_STAGE === stage) {
    throw new Error(`${stage}: injected failure`);
  }
  const child = spawn(command, args, {
    cwd: options.cwd ?? workspace,
    detached: true,
    env: { ...process.env, ...options.env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  let errorOutput = "";
  child.stdout.setEncoding("utf8").on("data", (chunk) => (output += chunk));
  child.stderr.setEncoding("utf8").on("data", (chunk) => (errorOutput += chunk));
  const timer = setTimeout(() => {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      child.kill("SIGKILL");
    }
  }, options.timeoutMs ?? timeoutMs);
  const outcome = await new Promise((done) => {
    child.once("error", (error) => done({ error }));
    child.once("exit", (code, signal) => done({ code, signal }));
  });
  clearTimeout(timer);
  if (outcome.error || outcome.code !== 0) {
    throw new Error(
      `${stage}: ${command} failed (${outcome.error?.message ?? outcome.signal ?? outcome.code})\n${sanitize(errorOutput || output).slice(-4000)}`,
    );
  }
  return output;
}

async function packageMetadata(directory) {
  return JSON.parse(await readFile(join(directory, "package.json"), "utf8"));
}

async function generatedFiles(root, prefix = "") {
  const files = [];
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...(await generatedFiles(root, path)));
    else if (entry.isFile()) files.push(path);
    else throw new Error(`snapshot: unsupported generated entry ${path}`);
  }
  return files.sort();
}

async function captureSnapshot(project) {
  const tree = await generatedFiles(project);
  const manifestText = await readFile(join(project, ".lace/manifest.json"), "utf8");
  const manifest = JSON.parse(manifestText);
  const classified = Object.keys(manifest.files).sort();
  if (
    JSON.stringify(tree.filter((path) => path !== ".lace/manifest.json")) !==
    JSON.stringify(classified)
  ) {
    throw new Error("snapshot: unclassified generated files");
  }
  const digests = {};
  for (const path of classified) {
    const bytes = await readFile(join(project, path));
    const digest = createHash("sha256").update(bytes).digest("hex");
    digests[path] = digest;
    if (manifest.files[path].owner === "managed" && manifest.files[path].sha256 !== digest) {
      throw new Error(`snapshot: managed hash mismatch for ${path}`);
    }
    if (manifest.files[path].owner === "user" && "sha256" in manifest.files[path]) {
      throw new Error(`snapshot: user-owned hash recorded for ${path}`);
    }
    if (/^(apps|packages|admin|engine)\//u.test(path)) {
      throw new Error(`snapshot: editable engine/admin source at ${path}`);
    }
    if (/LACE_(?:AUTH_SECRET|BUILD_TOKEN|MINIO_ROOT_SECRET)=\S/u.test(bytes.toString("utf8"))) {
      throw new Error(`snapshot: credential in ${path}`);
    }
  }
  return { tree, manifest: manifestText, digests };
}

async function verifySnapshots(parent, update = false) {
  for (const [variant, flag] of [
    ["default", false],
    ["cloudflare", true],
  ]) {
    const roots = [join(parent, `${variant}-a`), join(parent, `${variant}-b`)];
    for (const root of roots) {
      await mkdir(root, { recursive: true });
      await run(`snapshot-${variant}`, "node", [
        "packages/create-lace/dist/bin.js",
        "create",
        join(root, "acceptance-site"),
        ...(flag ? ["--cloudflare"] : []),
      ]);
    }
    const first = await captureSnapshot(join(roots[0], "acceptance-site"));
    const second = await captureSnapshot(join(roots[1], "acceptance-site"));
    if (JSON.stringify(first) !== JSON.stringify(second)) {
      throw new Error(`snapshot: ${variant} generation is not byte-stable`);
    }
    if (flag && !first.tree.includes("wrangler.jsonc")) {
      throw new Error("snapshot: Cloudflare variant is incomplete");
    }
    if (!flag && first.tree.includes("wrangler.jsonc")) {
      throw new Error("snapshot: default variant includes Cloudflare files");
    }
    const path = join(workspace, "tests", "fixtures", "generated-project", `${variant}.json`);
    const actual = `${JSON.stringify(first, null, 2)}\n`;
    if (update) {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, actual);
    } else if ((await readFile(path, "utf8")) !== actual) {
      throw new Error(
        `snapshot: ${variant} fixture differs; inspect generated tree before updating`,
      );
    }
  }
  console.info("Generated default and Cloudflare snapshots match two byte-stable regenerations");
}

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (typeof address === "string" || address === null) throw new Error("port: no TCP address");
  await new Promise((resolve) => server.close(resolve));
  return address.port;
}

async function prepareCompose(project, parent) {
  composeCwd = project;
  composeProject = `lace23c${randomUUID().replaceAll("-", "").slice(0, 10)}`;
  const apiPort = await freePort();
  const httpPort = await freePort();
  const apiImage = process.env.LACE_ACCEPTANCE_API_IMAGE ?? `${composeProject}-api:local`;
  const builderImage =
    process.env.LACE_ACCEPTANCE_BUILDER_IMAGE ?? `${composeProject}-builder:local`;
  if (!process.env.LACE_ACCEPTANCE_API_IMAGE) {
    await run("image-api", "docker", ["build", "-f", "apps/api/Dockerfile", "-t", apiImage, "."], {
      timeoutMs: 20 * 60_000,
    });
  }
  if (!process.env.LACE_ACCEPTANCE_BUILDER_IMAGE) {
    await run(
      "image-builder",
      "docker",
      ["build", "-f", "apps/builder/Dockerfile", "-t", builderImage, "."],
      { timeoutMs: 20 * 60_000 },
    );
  }
  const values = {
    LACE_API_IMAGE: apiImage,
    LACE_BUILDER_IMAGE: builderImage,
    LACE_PUBLIC_BASE_URL: `http://127.0.0.1:${apiPort}/`,
    LACE_API_PORT: String(apiPort),
    LACE_HTTP_PORT: String(httpPort),
    LACE_AUTH_SECRET: randomBytes(32).toString("hex"),
    LACE_MINIO_ROOT_ACCESS_KEY: `lace${randomBytes(8).toString("hex")}`,
    LACE_MINIO_ROOT_SECRET: randomBytes(24).toString("hex"),
    LACE_BUILDER_SECRET: randomBytes(32).toString("hex"),
    LACE_BUILD_TOKEN: randomBytes(32).toString("hex"),
  };
  for (const key of [
    "LACE_AUTH_SECRET",
    "LACE_MINIO_ROOT_ACCESS_KEY",
    "LACE_MINIO_ROOT_SECRET",
    "LACE_BUILDER_SECRET",
    "LACE_BUILD_TOKEN",
  ]) {
    secretValues.add(values[key]);
  }
  await mkdir(join(project, ".lace", "data"), { recursive: true });
  await writeFile(
    join(project, ".env"),
    `${Object.entries(values)
      .map(([name, value]) => `${name}=${value}`)
      .join("\n")}\n`,
  );
  await compose("image-minio", ["build", "--no-cache", "minio"], {
    timeoutMs: 30 * 60_000,
  });
  return { apiPort, httpPort, parent, project, values };
}

async function compose(stage, args, options = {}) {
  if (!composeProject || !composeCwd) throw new Error("Compose is not prepared");
  return run(stage, "docker", ["compose", "--project-name", composeProject, ...args], {
    cwd: composeCwd,
    ...options,
  });
}

async function request(base, path, options = {}) {
  const response = await fetch(new URL(path, base), {
    ...options,
    headers: {
      ...(options.json === undefined ? {} : { "content-type": "application/json" }),
      ...options.headers,
    },
    ...(options.json === undefined ? {} : { body: JSON.stringify(options.json) }),
    signal: AbortSignal.timeout(20_000),
  });
  const body = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new Error(`HTTP ${path}: status ${response.status}; ${sanitize(JSON.stringify(body))}`);
  }
  return { body, response };
}

async function nodeJourney(context) {
  const { project, apiPort } = context;
  const databasePath = join(project, ".lace", "data", "lace.sqlite");
  const env = { LACE_DATABASE_PATH: databasePath };
  for (const command of [
    ["db", "migrate"],
    ["content", "sync"],
  ]) {
    const output = await run(
      `cli-${command.join("-")}`,
      "pnpm",
      ["exec", "lace", ...command, "--json"],
      {
        cwd: project,
        env,
      },
    );
    if (!JSON.parse(output).ok) throw new Error(`cli-${command.join("-")}: unsuccessful result`);
  }
  const bootstrap = JSON.parse(
    await run("cli-bootstrap", "pnpm", ["exec", "lace", "auth", "bootstrap", "--json"], {
      cwd: project,
      env,
    }),
  );
  const token = bootstrap.data?.token;
  if (!bootstrap.ok || typeof token !== "string") throw new Error("cli-bootstrap: missing token");
  secretValues.add(token);
  await compose("compose-config", ["config", "--quiet"]);
  await compose("compose-api", ["up", "--detach", "--wait", "api"], { timeoutMs: 10 * 60_000 });
  const base = `http://127.0.0.1:${apiPort}/`;
  const ready = await request(base, "/health/ready");
  if (ready.body?.status !== "ready") throw new Error("api: readiness payload mismatch");
  const email = "acceptance@lace.test";
  const password = randomBytes(24).toString("hex");
  secretValues.add(password);
  await request(base, "/api/v1/setup/admin", {
    method: "POST",
    json: { email, password, token },
  });
  const login = await request(base, "/api/auth/sign-in/email", {
    method: "POST",
    headers: { origin: base.slice(0, -1) },
    json: { email, password },
  });
  const cookie = login.response.headers.getSetCookie()[0]?.split(";")[0];
  if (!cookie) throw new Error("login: no session cookie");
  secretValues.add(cookie);
  const models = await request(base, "/api/v1/admin/content-models", {
    headers: { cookie },
  });
  const modelNames = models.body?.items?.map((item) => item.key);
  if (JSON.stringify(modelNames) !== JSON.stringify(["home", "posts"])) {
    throw new Error(`api: generated config mismatch: ${JSON.stringify(modelNames)}`);
  }
  const homeEntries = await request(base, "/api/v1/admin/models/home/entries", {
    headers: { cookie },
  });
  const homeId = homeEntries.body?.items?.[0]?.id;
  if (typeof homeId !== "string") throw new Error("home: synchronized draft missing");
  await request(base, `/api/v1/admin/entries/${homeId}/publish`, {
    method: "POST",
    headers: { cookie },
    json: { expectedRevision: 1 },
  });
  const created = await request(base, "/api/v1/admin/models/posts/entries", {
    method: "POST",
    headers: { cookie },
    json: {
      blocks: [],
      fields: { summary: "Acceptance summary" },
      slug: "acceptance",
      title: "Draft title",
    },
  });
  const entryId = created.body?.id;
  if (typeof entryId !== "string") throw new Error("edit: entry ID missing");
  const saved = await request(base, `/api/v1/admin/entries/${entryId}/draft`, {
    method: "PUT",
    headers: { cookie },
    json: {
      blocks: [],
      expectedRevision: 1,
      fields: { summary: "Acceptance summary" },
      slug: "acceptance",
      title: "Published acceptance title",
    },
  });
  const revision = saved.body?.draft?.revision;
  if (revision !== 2) throw new Error("edit: unexpected revision");
  await request(base, `/api/v1/admin/entries/${entryId}/publish`, {
    method: "POST",
    headers: { cookie },
    json: { expectedRevision: revision },
  });
  await run("astro-build", "pnpm", ["build"], {
    cwd: project,
    env: { LACE_PUBLIC_BASE_URL: base, ASTRO_TELEMETRY_DISABLED: "1" },
  });
  const html = await readFile(
    join(project, "site", "dist", "blog", "acceptance", "index.html"),
    "utf8",
  );
  if (!html.includes("Published acceptance title")) {
    throw new Error("astro-build: published content missing from generated site");
  }
  console.info(
    "Generated Node journey: migrate, sync, bootstrap, login, edit, publish, Astro build passed",
  );
  return { base, cookie };
}

async function productionSmoke(context, session) {
  const createdToken = await request(session.base, "/api/v1/admin/api-tokens", {
    method: "POST",
    headers: { cookie: session.cookie },
    json: { name: "acceptance-builder" },
  });
  const buildToken = createdToken.body?.token;
  if (typeof buildToken !== "string") throw new Error("compose-production: build token missing");
  secretValues.add(buildToken);
  context.values.LACE_BUILD_TOKEN = buildToken;
  await writeFile(
    join(context.project, ".env"),
    `${Object.entries(context.values)
      .map(([name, value]) => `${name}=${value}`)
      .join("\n")}\n`,
  );
  await compose("compose-production", ["up", "--detach", "--wait"], {
    timeoutMs: 10 * 60_000,
  });
  const publicBase = `http://127.0.0.1:${context.httpPort}/`;
  const health = await request(publicBase, "/health/ready");
  if (health.body?.status !== "ready")
    throw new Error("compose-production: web proxy is not ready");
  const admin = await fetch(new URL("/admin/", publicBase), {
    signal: AbortSignal.timeout(20_000),
  });
  if (!admin.ok) {
    throw new Error(
      `compose-production: admin returned ${admin.status}: ${sanitize((await admin.text()).slice(0, 500))}`,
    );
  }
  let built = false;
  for (let attempt = 0; attempt < 180; attempt += 1) {
    try {
      const response = await fetch(new URL("/blog/acceptance/", publicBase), {
        signal: AbortSignal.timeout(2000),
      });
      if (response.ok && (await response.text()).includes("Published acceptance title")) {
        built = true;
        break;
      }
    } catch {
      /* Wait for the fixed-command builder to publish its release. */
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!built) throw new Error("compose-production: builder did not publish generated site");
  console.info("Generated Compose production services and web proxy passed");
}

async function cloudflareSmoke(context, tarballs) {
  const cloudProject = join(context.parent, "cloudflare-consumer", "acceptance-site");
  await mkdir(dirname(cloudProject), { recursive: true });
  await run("cloudflare-generate", "node", [
    "packages/create-lace/dist/bin.js",
    "create",
    cloudProject,
    "--cloudflare",
  ]);
  await installPackedConsumer(cloudProject, tarballs);
  await run("cloudflare-bundle", "pnpm", ["build"], {
    cwd: cloudProject,
    env: {
      ASTRO_TELEMETRY_DISABLED: "1",
      LACE_PUBLIC_BASE_URL: `http://127.0.0.1:${context.apiPort}/`,
    },
  });
  const config = await readFile(join(cloudProject, "wrangler.jsonc"), "utf8");
  const workflow = await readFile(
    join(cloudProject, ".github", "workflows", "cloudflare.yml"),
    "utf8",
  );
  if (
    !config.includes('"pages_build_output_dir": "site/dist"') ||
    !workflow.includes("site/dist")
  ) {
    throw new Error("cloudflare-bundle: generated Pages paths differ");
  }
  const port = await freePort();
  const child = spawn(
    "pnpm",
    [
      "exec",
      "wrangler",
      "pages",
      "dev",
      "site/dist",
      "--ip",
      "127.0.0.1",
      "--port",
      String(port),
      "--show-interactive-dev-session",
      "false",
    ],
    {
      cwd: cloudProject,
      detached: true,
      env: { ...process.env, CI: "true", WRANGLER_SEND_METRICS: "false" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  child.stdout.setEncoding("utf8").on("data", (chunk) => (output += chunk));
  child.stderr.setEncoding("utf8").on("data", (chunk) => (output += chunk));
  try {
    let served = false;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (child.exitCode !== null) break;
      try {
        const response = await fetch(`http://127.0.0.1:${port}/blog/acceptance/`, {
          signal: AbortSignal.timeout(1000),
        });
        if (response.ok && (await response.text()).includes("Published acceptance title")) {
          served = true;
          break;
        }
      } catch {
        /* Wait for local Pages runtime. */
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!served)
      throw new Error(`cloudflare-pages: local preview failed\n${sanitize(output).slice(-2500)}`);
  } finally {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
  }
  await run(
    "cloudflare-worker-smoke",
    "pnpm",
    ["--dir", "apps/api", "exec", "vitest", "run", "src/worker-smoke.test.mjs"],
    { timeoutMs: 5 * 60_000 },
  );
  console.info("Generated Cloudflare Pages bundle and local Worker smoke passed");
}

async function packConsumerGraph(tarballDirectory) {
  const root = await packageMetadata(join(workspace, "packages/create-lace/templates"));
  const site = await packageMetadata(join(workspace, "packages/create-lace/templates/site"));
  const pending = Object.keys({ ...root.dependencies, ...site.dependencies }).filter((name) =>
    name.startsWith("@lacecms/"),
  );
  const packages = new Map();
  while (pending.length > 0) {
    const name = pending.pop();
    if (packages.has(name)) continue;
    const directory = join(workspace, "packages", name.slice("@lacecms/".length));
    const manifest = await packageMetadata(directory);
    if (manifest.name !== name) throw new Error(`pack: missing workspace package ${name}`);
    packages.set(name, directory);
    pending.push(
      ...Object.keys(manifest.dependencies ?? {}).filter((dependency) =>
        dependency.startsWith("@lacecms/"),
      ),
    );
  }
  const tarballs = new Map();
  for (const [name, directory] of [...packages].sort(([a], [b]) => a.localeCompare(b))) {
    const packed = JSON.parse(
      await run("pack", "pnpm", ["pack", "--pack-destination", tarballDirectory, "--json"], {
        cwd: directory,
      }),
    );
    const filename = packed.filename;
    if (!filename) throw new Error(`pack: no tarball reported for ${name}`);
    tarballs.set(name, filename);
  }
  return tarballs;
}

async function installPackedConsumer(project, tarballs) {
  const artifactDirectory = join(project, ".lace", "acceptance-packages");
  await mkdir(artifactDirectory, { recursive: true });
  const references = new Map();
  for (const [name, filename] of tarballs) {
    await copyFile(filename, join(artifactDirectory, basename(filename)));
    references.set(name, `file:.lace/acceptance-packages/${basename(filename)}`);
  }
  for (const directory of [project, join(project, "site")]) {
    const path = join(directory, "package.json");
    const packageJson = await packageMetadata(directory);
    for (const section of ["dependencies", "devDependencies"]) {
      for (const name of Object.keys(packageJson[section] ?? {})) {
        if (references.has(name)) {
          const reference = references.get(name);
          packageJson[section][name] =
            directory === project ? reference : reference.replace("file:", "file:../");
        }
      }
    }
    await writeFile(path, `${JSON.stringify(packageJson, null, 2)}\n`);
  }
  const workspaceFile = join(project, "pnpm-workspace.yaml");
  const workspaceYaml = await readFile(workspaceFile, "utf8");
  const overrides = [...references]
    .filter(([name]) => name !== "@lacecms/sdk")
    .map(([name, file]) => `  '${name}': '${file}'`)
    .join("\n");
  await writeFile(workspaceFile, `${workspaceYaml}\noverrides:\n${overrides}\n`);
  await copyFile(join(workspace, "pnpm-lock.yaml"), join(project, "pnpm-lock.yaml"));
  await run("install", "pnpm", ["install", "--no-frozen-lockfile"], {
    cwd: project,
  });
  await run("frozen-install", "pnpm", ["install", "--frozen-lockfile", "--offline"], {
    cwd: project,
  });
  const lock = await readFile(join(project, "pnpm-lock.yaml"), "utf8");
  if (/workspace:|link:\.\.\//u.test(lock) || lock.includes(workspace)) {
    throw new Error("install: lockfile resolves to the Lace source workspace");
  }
  const projectReal = await realpath(project);
  for (const name of tarballs.keys()) {
    const installPath = join(project, "node_modules", ...name.split("/"));
    const resolved = await realpath(installPath).catch(() => undefined);
    if (resolved && !resolved.startsWith(`${projectReal}/`)) {
      throw new Error(`install: ${name} resolves outside generated project: ${resolved}`);
    }
  }
}

async function main() {
  const phase = process.argv[2] ?? "all";
  if (!["packages", "node", "all", "snapshots", "self-test"].includes(phase)) {
    throw new Error(`Unknown acceptance phase: ${phase}`);
  }
  const parent = await mkdtemp(join(tmpdir(), "lace-generated-acceptance-"));
  temporaryPaths.push(parent);
  if (phase === "self-test") {
    await run("forced-failure", process.execPath, [
      "-e",
      "console.error(process.env.LACE_ACCEPTANCE_SECRET_SENTINEL); process.exit(17)",
    ]);
    return;
  }
  if (phase === "snapshots") {
    await run("build-generator", "pnpm", ["--filter", "create-lace", "build"]);
    await verifySnapshots(parent, process.argv.includes("--update"));
    return;
  }
  const tarballDirectory = join(parent, "tarballs");
  await run("build", "pnpm", ["build"]);
  await verifySnapshots(parent);
  await run("mkdir-tarballs", "mkdir", ["-p", tarballDirectory]);
  const tarballs = await packConsumerGraph(tarballDirectory);
  const project = join(parent, "consumer", "acceptance-site");
  await run("mkdir-consumer", "mkdir", ["-p", dirname(project)]);
  await run("generate", "node", ["packages/create-lace/dist/bin.js", "create", project]);
  await installPackedConsumer(project, tarballs);
  console.info(`Packed consumer installed: ${tarballs.size} Lace tarballs; ${basename(project)}`);
  if (phase === "packages") return;
  const context = await prepareCompose(project, parent);
  const session = await nodeJourney(context);
  if (phase === "node") return;
  await productionSmoke(context, session);
  await cloudflareSmoke(context, tarballs);
}

try {
  await main();
} catch (error) {
  console.error(sanitize(error instanceof Error ? error.message : error));
  if (composeProject && composeCwd) {
    try {
      const logs = await compose("compose-logs", ["logs", "--no-color", "--tail", "30"]);
      console.error(sanitize(logs).slice(-6000));
    } catch {
      /* Keep the original acceptance failure. */
    }
  }
  process.exitCode = 1;
} finally {
  if (composeProject && composeCwd) {
    try {
      await compose("compose-down", ["down", "--volumes", "--remove-orphans"], {
        timeoutMs: 3 * 60_000,
      });
    } catch (error) {
      console.error(sanitize(error instanceof Error ? error.message : error));
      process.exitCode = 1;
    }
  }
  if (process.env.LACE_ACCEPTANCE_KEEP_TEMP !== "1") {
    for (const path of temporaryPaths) await rm(path, { recursive: true, force: true });
  } else {
    for (const path of temporaryPaths)
      console.info(`Acceptance files: ${relative(workspace, path)}`);
  }
}
