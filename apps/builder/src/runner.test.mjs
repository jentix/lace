import {
  chmod,
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  readlink,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";
import { FixedCommandBuilder } from "../dist/index.js";

const cleanup = [];
afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((item) => item()));
});

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "lace-builder-test-"));
  cleanup.push(() => rm(root, { recursive: true, force: true }));
  const source = join(root, "source");
  await mkdir(join(source, "apps/site"), { recursive: true });
  for (const file of [
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "apps/site/package.json",
  ])
    await writeFile(join(source, file), "{}");
  await writeFile(join(source, ".env"), "SECRET=do-not-copy");
  const tool = join(root, "fake-pnpm");
  await writeFile(
    tool,
    `#!/bin/sh
if [ "$1" = "install" ]; then
  test "$2" = "--frozen-lockfile" || exit 1
  test ! -e .env || exit 1
  exit 0
fi
test "$1" = "--filter" || exit 1
test "$2" = "@lacecms/app-site..." || exit 1
test "$3" = "build" || exit 1
test ! -e fail-build || exit 1
mkdir -p apps/site/dist
echo '<h1>ok</h1>' > apps/site/dist/index.html
`,
  );
  await chmod(tool, 0o755);
  let version = 1;
  const builder = new FixedCommandBuilder({
    sourceRoot: source,
    workRoot: join(root, "work"),
    outputRoot: join(root, "output"),
    apiBaseUrl: "http://api.test/",
    buildToken: "build-token",
    toolPath: tool,
    versionReader: async () => version,
  });
  return {
    builder,
    root,
    source,
    tool,
    setVersion: (value) => {
      version = value;
    },
  };
}

test("builds from a filtered copy and atomically retains two successful releases", async () => {
  const { builder, root, setVersion } = await fixture();
  const output = join(root, "output");
  for (const version of [1, 2, 3]) {
    setVersion(version);
    expect(await builder.build({ buildId: `build-${version}`, targetVersion: version })).toEqual({
      status: "succeeded",
    });
    const current = await readlink(join(output, "current"));
    expect((await stat(join(output, current))).mode & 0o777).toBe(0o755);
    expect(await readFile(join(output, current, ".lace-release.json"), "utf8")).toContain(
      `"version":${version}`,
    );
    expect(await readFile(join(output, current, "index.html"), "utf8")).toContain("ok");
  }
  expect((await readdir(join(output, "releases"))).length).toBe(2);
  const retainedVersions = await Promise.all(
    (await readdir(join(output, "releases"))).map(
      async (name) =>
        JSON.parse(await readFile(join(output, "releases", name, ".lace-release.json"), "utf8"))
          .version,
    ),
  );
  expect(retainedVersions.sort()).toEqual([2, 3]);
  expect((await lstat(join(output, "current"))).isSymbolicLink()).toBe(true);
});

test("version advancement during a build leaves output unpublished", async () => {
  const { root, source, tool } = await fixture();
  let reads = 0;
  const builder = new FixedCommandBuilder({
    sourceRoot: source,
    workRoot: join(root, "work-advanced"),
    outputRoot: join(root, "output-advanced"),
    apiBaseUrl: "http://api.test/",
    buildToken: "build-token",
    toolPath: tool,
    versionReader: async () => {
      reads += 1;
      return reads === 3 ? 2 : 1;
    },
  });
  expect(await builder.build({ buildId: "stale", targetVersion: 1 })).toEqual({
    status: "failed",
    reason: "version_changed",
  });
  expect(await readdir(join(root, "output-advanced/releases"))).toEqual([]);
});

test("build failure or changed version leaves current release intact", async () => {
  const { builder, root, source, setVersion } = await fixture();
  expect((await builder.build({ buildId: "first", targetVersion: 1 })).status).toBe("succeeded");
  const current = await readlink(join(root, "output/current"));
  await writeFile(join(source, "fail-build"), "yes");
  setVersion(2);
  expect(await builder.build({ buildId: "failed", targetVersion: 2 })).toEqual({
    status: "failed",
    reason: "build_failed",
  });
  expect(await readlink(join(root, "output/current"))).toBe(current);
  setVersion(3);
  expect(await builder.build({ buildId: "stale", targetVersion: 2 })).toEqual({
    status: "failed",
    reason: "version_changed",
  });
  expect(await readlink(join(root, "output/current"))).toBe(current);
});

test("builds the exact generated site layout with fixed commands", async () => {
  const { root, source, tool } = await fixture();
  await rm(join(source, "apps"), { recursive: true });
  await mkdir(join(source, "site"));
  await writeFile(join(source, "site/package.json"), "{}");
  await writeFile(
    tool,
    `#!/bin/sh
if [ "$1" = "install" ]; then
  test "$2" = "--frozen-lockfile" || exit 1
  test "$#" = "2" || exit 1
  exit 0
fi
test "$1" = "--dir" || exit 1
test "$2" = "site" || exit 1
test "$3" = "build" || exit 1
mkdir -p site/dist
echo '<h1>generated</h1>' > site/dist/index.html
`,
  );
  const builder = new FixedCommandBuilder({
    sourceRoot: source,
    workRoot: join(root, "generated-work"),
    outputRoot: join(root, "generated-output"),
    apiBaseUrl: "http://api.test/",
    buildToken: "build-token",
    toolPath: tool,
    versionReader: async () => 1,
  });
  expect(await builder.build({ buildId: "generated", targetVersion: 1 })).toEqual({
    status: "succeeded",
  });
  const current = await readlink(join(root, "generated-output/current"));
  expect(await readFile(join(root, "generated-output", current, "index.html"), "utf8")).toContain(
    "generated",
  );
});
