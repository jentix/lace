import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import {
  chmod,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readlink,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { basename, join, relative } from "node:path";

export interface BuildRequest {
  readonly buildId: string;
  readonly targetVersion: number;
}

export type BuildResult =
  | Readonly<{ readonly status: "succeeded" }>
  | Readonly<{
      readonly status: "failed";
      readonly reason: "source_invalid" | "install_failed" | "build_failed" | "version_changed";
    }>;

export interface BuilderSettings {
  readonly sourceRoot: string;
  readonly workRoot: string;
  readonly outputRoot: string;
  readonly apiBaseUrl: string;
  readonly buildToken: string;
  readonly publicBaseUrl?: string;
  /** Internal test seam; production always uses image-pinned pnpm from PATH. */
  readonly toolPath?: string;
  /** Internal test seam; production reads the published export ETag. */
  readonly versionReader?: () => Promise<number>;
}

type Stage = "source_invalid" | "install_failed" | "build_failed" | "version_changed";

class StageError extends Error {
  public constructor(readonly stage: Stage) {
    super(stage);
  }
}

const SKIPPED_NAMES = new Set([
  ".git",
  "node_modules",
  "dist",
  ".astro",
  ".turbo",
  "coverage",
  "dev-data",
  ".lace-acceptance",
]);

async function copyProject(sourceRoot: string, destination: string): Promise<void> {
  await cp(sourceRoot, destination, {
    recursive: true,
    filter: async (source) => {
      const name = basename(source);
      if (
        source !== sourceRoot &&
        (SKIPPED_NAMES.has(name) || name === ".env" || name.startsWith(".env."))
      )
        return false;
      const stat = await lstat(source);
      if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile()))
        throw new StageError("source_invalid");
      return true;
    },
  });
  for (const required of [
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "apps/site/package.json",
  ]) {
    try {
      if (!(await lstat(join(destination, required))).isFile()) throw new Error();
    } catch {
      throw new StageError("source_invalid");
    }
  }
}

async function execute(
  cwd: string,
  args: readonly string[],
  environment: NodeJS.ProcessEnv,
  toolPath: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(toolPath, [...args], { cwd, env: environment, stdio: "ignore" });
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
    }, 10 * 60_000);
    child.on("error", () => {
      clearTimeout(timeout);
      resolve(false);
    });
    child.on("exit", (code) => {
      clearTimeout(timeout);
      resolve(code === 0);
    });
  });
}

async function currentVersion(settings: BuilderSettings): Promise<number> {
  try {
    const url = new URL("api/v1/public/build-export", settings.apiBaseUrl);
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${settings.buildToken}` },
      signal: AbortSignal.timeout(30_000),
    });
    await response.body?.cancel();
    const etag = response.headers.get("etag");
    if (!response.ok || etag === null || !/^"(?:0|[1-9][0-9]*)"$/u.test(etag)) throw new Error();
    const version = Number(etag.slice(1, -1));
    if (!Number.isSafeInteger(version)) throw new Error();
    return version;
  } catch {
    throw new StageError("version_changed");
  }
}

async function pruneReleases(
  releasesRoot: string,
  currentName: string,
  previousName?: string,
): Promise<void> {
  const entries = await readdir(releasesRoot, { withFileTypes: true });
  const keep = new Set([currentName, previousName]);
  for (const entry of entries) {
    if (entry.isDirectory() && !keep.has(entry.name))
      await rm(join(releasesRoot, entry.name), { recursive: true, force: true });
  }
}

export class FixedCommandBuilder {
  public constructor(private readonly settings: BuilderSettings) {
    if (settings.buildToken.length === 0) throw new TypeError("Build token is required.");
    const api = new URL(settings.apiBaseUrl);
    if (!["http:", "https:"].includes(api.protocol) || !api.pathname.endsWith("/"))
      throw new TypeError("API base URL must be an HTTP URL ending in /.");
  }

  public async build(request: BuildRequest): Promise<BuildResult> {
    const { sourceRoot, workRoot, outputRoot } = this.settings;
    let workDirectory: string | undefined;
    let releaseDirectory: string | undefined;
    try {
      await mkdir(workRoot, { recursive: true });
      const releasesRoot = join(outputRoot, "releases");
      await mkdir(releasesRoot, { recursive: true });
      workDirectory = await mkdtemp(join(workRoot, "build-"));
      const project = join(workDirectory, "project");
      await copyProject(sourceRoot, project);
      if (
        (await (this.settings.versionReader?.() ?? currentVersion(this.settings))) !==
        request.targetVersion
      )
        throw new StageError("version_changed");
      const environment: NodeJS.ProcessEnv = {
        PATH: process.env.PATH,
        HOME: workDirectory,
        PNPM_HOME: process.env.PNPM_HOME,
        ASTRO_TELEMETRY_DISABLED: "1",
        LACE_SITE_DATA_MODE: "live",
        LACE_API_BASE_URL: this.settings.apiBaseUrl,
        LACE_BUILD_TOKEN: this.settings.buildToken,
        LACE_EXPECTED_PUBLISHED_VERSION: String(request.targetVersion),
        ...(this.settings.publicBaseUrl === undefined
          ? {}
          : { LACE_PUBLIC_BASE_URL: this.settings.publicBaseUrl }),
      };
      if (
        !(await execute(
          project,
          ["install", "--frozen-lockfile", "--filter", "@lacecms/app-site..."],
          environment,
          this.settings.toolPath ?? "pnpm",
        ))
      )
        throw new StageError("install_failed");
      if (
        !(await execute(
          project,
          ["--filter", "@lacecms/app-site...", "build"],
          environment,
          this.settings.toolPath ?? "pnpm",
        ))
      )
        throw new StageError("build_failed");
      const siteOutput = join(project, "apps/site/dist");
      if (!(await lstat(join(siteOutput, "index.html"))).isFile())
        throw new StageError("build_failed");
      if (
        (await (this.settings.versionReader?.() ?? currentVersion(this.settings))) !==
        request.targetVersion
      )
        throw new StageError("version_changed");
      releaseDirectory = await mkdtemp(join(releasesRoot, "release-"));
      await cp(siteOutput, releaseDirectory, {
        recursive: true,
        filter: async (path) => {
          if ((await lstat(path)).isSymbolicLink()) throw new StageError("build_failed");
          return true;
        },
      });
      // mkdtemp creates 0700 directories; the read-only web server runs as another user.
      await chmod(releaseDirectory, 0o755);
      await writeFile(
        join(releaseDirectory, ".lace-release.json"),
        JSON.stringify({ version: request.targetVersion }),
      );
      if (
        (await (this.settings.versionReader?.() ?? currentVersion(this.settings))) !==
        request.targetVersion
      )
        throw new StageError("version_changed");
      let previousName: string | undefined;
      try {
        const oldTarget = await readlink(join(outputRoot, "current"));
        if (/^releases\/release-[A-Za-z0-9-]+$/u.test(oldTarget))
          previousName = basename(oldTarget);
      } catch {
        /* no active release yet */
      }
      const link = join(outputRoot, `.current-${randomUUID()}`);
      await symlink(relative(outputRoot, releaseDirectory), link);
      try {
        await rename(link, join(outputRoot, "current"));
      } catch (error) {
        await rm(link, { force: true });
        throw error;
      }
      const currentName = basename(releaseDirectory);
      releaseDirectory = undefined;
      try {
        await pruneReleases(releasesRoot, currentName, previousName);
      } catch {
        /* successful release remains active */
      }
      return { status: "succeeded" };
    } catch (error) {
      return {
        status: "failed",
        reason: error instanceof StageError ? error.stage : "build_failed",
      };
    } finally {
      if (workDirectory !== undefined) {
        try {
          await rm(workDirectory, { recursive: true, force: true });
        } catch {
          /* scratch cleanup can retry later */
        }
      }
      if (releaseDirectory !== undefined) {
        try {
          await rm(releaseDirectory, { recursive: true, force: true });
        } catch {
          /* unpublished release stays unserved */
        }
      }
    }
  }
}
