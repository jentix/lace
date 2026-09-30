import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, rm, realpath, readFile, readdir, writeFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { parseUpgradeArguments } from "../dist/upgrade-command.js";
import { upgradeHash } from "../dist/upgrade-input.js";

const roots = [];
const bin = fileURLToPath(new URL("../dist/bin.js", import.meta.url));
const generator = fileURLToPath(new URL("../../create-lace/dist/bin.js", import.meta.url));
afterEach(async () => {
  await Promise.all(roots.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});
async function snapshot(root) {
  const files = {};
  async function visit(directory, prefix = "") {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const path = prefix + entry.name;
      if (entry.isDirectory()) await visit(join(directory, entry.name), `${path}/`);
      else files[path] = (await readFile(join(directory, entry.name))).toString("base64");
    }
  }
  await visit(root);
  return files;
}
async function fixture(cloudflare = false) {
  const root = await realpath(await mkdtemp(join(tmpdir(), "lace-upgrade-cli-")));
  roots.push(root);
  const project = join(root, "working", "my-site");
  const template = join(root, "target", "my-site");
  const { mkdir } = await import("node:fs/promises");
  await mkdir(join(root, "working"));
  await mkdir(join(root, "target"));
  for (const path of [project, template])
    execFileSync(process.execPath, [
      generator,
      "create",
      path,
      ...(cloudflare ? ["--cloudflare"] : []),
    ]);
  return { root, project, template };
}
function cli(args, cwd) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([name]) => !name.startsWith("LACE_") && !name.startsWith("CLOUDFLARE_"),
    ),
  );
  return spawnSync(process.execPath, [bin, "upgrade", ...args], { cwd, env, encoding: "utf8" });
}
async function updateTemplate(root, path, bytes) {
  await writeFile(join(root, path), bytes);
  const location = join(root, ".lace/manifest.json");
  const manifest = JSON.parse(await readFile(location, "utf8"));
  manifest.templateVersion = "0.3.0";
  manifest.files[path].sha256 = upgradeHash(Buffer.from(bytes));
  await writeFile(location, JSON.stringify(manifest));
}

describe("upgrade CLI", () => {
  it.each([
    [],
    ["--apply"],
    ["--template"],
    ["--template", "x", "--json", "--json"],
    ["--template", "x", "--project", "a", "--project", "b"],
    ["--template", "x", "--target", "node"],
    ["--template", "x", "extra"],
    ["--rollback", "--apply"],
    ["--rollback", "--template", "x"],
    ["--rollback", "--rollback"],
  ])("rejects invalid args %j", (args) => {
    expect(() => parseUpgradeArguments(args, "/cwd")).toThrow();
  });
  it("selects explicit template and defaults to the current directory", () => {
    expect(parseUpgradeArguments(["--template", "/template", "--json"], "/cwd")).toEqual({
      project: "/cwd",
      template: "/template",
      json: true,
      action: "review",
    });
  });
  it("selects template-free rollback and explicit apply", () => {
    expect(parseUpgradeArguments(["--rollback"], "/cwd")).toMatchObject({
      project: "/cwd",
      template: undefined,
      action: "rollback",
    });
    expect(parseUpgradeArguments(["--template", "/template", "--apply"], "/cwd").action).toBe(
      "apply",
    );
  });
  it.each([false, true])(
    "reviews generated project without credentials, cloudflare=%s",
    async (cloudflare) => {
      const { root, project, template } = await fixture(cloudflare);
      await writeFile(join(project, "site/src/pages/index.astro"), "User site edits\n");
      await writeFile(join(project, "site/custom.txt"), "untracked user source");
      const targetPath = cloudflare ? "wrangler.jsonc" : "docker-compose.yml";
      await updateTemplate(
        template,
        targetPath,
        (await readFile(join(template, targetPath), "utf8")) + "\n",
      );
      const before = await snapshot(root);
      const args = ["--template", template, "--json"];
      const first = cli(args, project);
      const second = cli(args, project);
      expect(first.status).toBe(0);
      expect(first.stderr).toBe("");
      expect(second.stdout).toBe(first.stdout);
      const result = JSON.parse(first.stdout);
      expect(result).toMatchObject({
        ok: true,
        code: "UPGRADE_PLAN",
        data: { dryRun: true, changes: 1, conflicts: 0 },
      });
      expect(result.data.decisions.find(({ path }) => path === targetPath).action).toBe("replace");
      const human = cli(["--project", project, "--template", template], root);
      expect(human.stdout).toContain("No files written.");
      expect(human.stdout).toContain(`--- a/${targetPath}`);
      expect(cli(["--project", project, "--template", template], root).stdout).toBe(human.stdout);
      expect(await snapshot(root)).toEqual(before);
    },
  );
  it("returns conflict diffs in review and publishes proposed artifacts on apply", async () => {
    const { root, project, template } = await fixture();
    await writeFile(join(project, "docker-compose.yml"), "user deployment\n");
    await updateTemplate(template, "docker-compose.yml", "target deployment\n");
    const before = await snapshot(root);
    const result = cli(["--project", project, "--template", template, "--json"], root);
    expect(result.status).toBe(2);
    expect(result.stderr).toBe("");
    expect(
      JSON.parse(result.stdout).data.decisions.find(({ path }) => path === "docker-compose.yml")
        .diff,
    ).toContain("-user deployment\n+target deployment\n");
    expect(await snapshot(root)).toEqual(before);
    const apply = cli(["--project", project, "--template", template, "--apply", "--json"], root);
    expect(apply.status).toBe(2);
    expect(JSON.parse(apply.stdout)).toMatchObject({
      ok: false,
      code: "UPGRADE_CONFLICTS",
      data: { conflictPath: ".lace/conflicts/0.3.0" },
    });
    const after = await snapshot(root);
    for (const [path, bytes] of Object.entries(before)) expect(after[path]).toBe(bytes);
    expect(
      await readFile(join(project, ".lace/conflicts/0.3.0/proposed/docker-compose.yml"), "utf8"),
    ).toBe("target deployment\n");
  });
  it("reports stable manifest, missing-target, hash and symlink errors", async () => {
    const { root, project, template } = await fixture();
    const args = ["--project", project, "--template", template, "--json"];
    const location = join(template, ".lace/manifest.json");
    const original = await readFile(location);
    const metadata = JSON.parse(original);
    metadata.schemaVersion = 99;
    await writeFile(location, JSON.stringify(metadata));
    let result = cli(args, root);
    expect(result.status).toBe(4);
    expect(JSON.parse(result.stdout).code).toBe("UPGRADE_INPUT");
    await writeFile(location, original);
    await writeFile(join(template, "docker-compose.yml"), "not a pristine target");
    result = cli(args, root);
    expect(result.status).toBe(4);
    expect(result.stdout).toContain("pristine");
    await rm(join(template, "docker-compose.yml"));
    await symlink("/nonexistent", join(template, "docker-compose.yml"));
    result = cli(args, root);
    expect(result.status).toBe(4);
    expect(result.stdout).toContain("symbolic");
    result = cli(["--template", resolve(root, "missing"), "--json"], project);
    expect(result.status).toBe(4);
  });
  it.each([false, true])(
    "applies and rolls back generated project without credentials, cloudflare=%s",
    async (cloudflare) => {
      const { root, project, template } = await fixture(cloudflare);
      const targetPath = cloudflare ? "wrangler.jsonc" : "docker-compose.yml";
      await writeFile(join(project, "site/src/pages/index.astro"), "User site edits\n");
      await writeFile(join(project, "site/custom.txt"), "untracked source\n");
      const original = await snapshot(project);
      const target = (await readFile(join(template, targetPath), "utf8")) + "\n";
      await updateTemplate(template, targetPath, target);
      await writeFile(
        join(template, ".lace/upgrade-instructions.json"),
        JSON.stringify({
          schemaVersion: 1,
          templateVersion: "0.3.0",
          database: ["Back up, then run lace db migrate --target node."],
          configuration: ["Review config, then run lace content sync."],
        }),
      );
      const targetBefore = await snapshot(template);
      const args = ["--project", project, "--template", template, "--apply", "--json"];
      const apply = cli(args, root);
      expect(apply.status).toBe(0);
      expect(apply.stderr).toBe("");
      const result = JSON.parse(apply.stdout);
      expect(result).toMatchObject({
        ok: true,
        code: "UPGRADE_APPLIED",
        data: { status: "applied", instructions: { templateVersion: "0.3.0" } },
      });
      expect(result.guidance).toContain("lace db migrate");
      expect(await readFile(join(project, targetPath), "utf8")).toBe(target);
      expect(await snapshot(template)).toEqual(targetBefore);
      const upgraded = await snapshot(project);
      expect(JSON.parse(cli(args, root).stdout).code).toBe("UPGRADE_ALREADY_CURRENT");
      expect(await snapshot(project)).toEqual(upgraded);
      for (const [path, value] of Object.entries(original))
        if (path !== targetPath && path !== ".lace/manifest.json")
          expect(upgraded[path]).toBe(value);
      await rm(template, { recursive: true });
      const rollback = cli(["--project", project, "--rollback", "--json"], root);
      expect(rollback.status).toBe(0);
      expect(JSON.parse(rollback.stdout)).toMatchObject({ code: "UPGRADE_ROLLED_BACK" });
      const restored = await snapshot(project);
      for (const [path, value] of Object.entries(original)) expect(restored[path]).toBe(value);
      expect(Object.keys(restored).filter((path) => !path.startsWith(".lace/upgrade/"))).toEqual(
        Object.keys(original),
      );
      expect(
        JSON.parse(cli(["--project", project, "--rollback", "--json"], root).stdout).code,
      ).toBe("UPGRADE_ALREADY_ROLLED_BACK");
    },
  );
  it("invalid instructions fail before project mutation and missing rollback returns stable input error", async () => {
    const { root, project, template } = await fixture();
    const before = await snapshot(project);
    await writeFile(
      join(template, ".lace/upgrade-instructions.json"),
      JSON.stringify({
        schemaVersion: 1,
        templateVersion: "wrong",
        database: [],
        configuration: [],
      }),
    );
    const failed = cli(["--project", project, "--template", template, "--apply", "--json"], root);
    expect(failed.status).toBe(4);
    expect(JSON.parse(failed.stdout).code).toBe("UPGRADE_INPUT");
    expect(await snapshot(project)).toEqual(before);
    const rollback = cli(["--project", project, "--rollback", "--json"], root);
    expect(rollback.status).toBe(4);
    expect(JSON.parse(rollback.stdout).code).toBe("UPGRADE_INPUT");
  });
});
