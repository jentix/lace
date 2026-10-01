import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, test } from "vitest";
import { generateProject, runCli, TEMPLATE_FILES, TEMPLATE_VERSION } from "../dist/index.js";

const roots = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function root() {
  const path = await mkdtemp(join(tmpdir(), "lace-generator-test-"));
  roots.push(path);
  return path;
}

async function listFiles(path, prefix = "") {
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...(await listFiles(join(path, entry.name), relative)));
    else files.push(relative);
  }
  return files.sort();
}

test("template inventory classifies every bundled file", async () => {
  const templates = fileURLToPath(new URL("../templates/", import.meta.url));
  expect(TEMPLATE_FILES.map((file) => file.path).sort()).toEqual(await listFiles(templates));
  expect(new Set(TEMPLATE_FILES.map((file) => file.path)).size).toBe(TEMPLATE_FILES.length);
  expect(TEMPLATE_FILES.every((file) => file.owner === "managed" || file.owner === "user")).toBe(
    true,
  );
});

test("generates deterministic owned source and hashed managed files", async () => {
  const leftRoot = await root();
  const rightRoot = await root();
  const left = await generateProject({ target: join(leftRoot, "my-site") });
  const right = await generateProject({ target: join(rightRoot, "my-site") });
  expect(left.manifest).toEqual(right.manifest);
  expect(left.manifest.templateVersion).toBe(TEMPLATE_VERSION);
  const files = await listFiles(left.path);
  expect(files).toEqual([".lace/manifest.json", ...Object.keys(left.manifest.files)].sort());
  expect(files).not.toContain("wrangler.jsonc");
  expect(files.every((file) => !file.startsWith("apps/") && !file.startsWith("packages/"))).toBe(
    true,
  );
  for (const [path, ownership] of Object.entries(left.manifest.files)) {
    const bytes = await readFile(join(left.path, path));
    expect(bytes).toEqual(await readFile(join(right.path, path)));
    if (ownership.owner === "managed") {
      expect(ownership.sha256).toBe(createHash("sha256").update(bytes).digest("hex"));
    } else {
      expect(ownership).toEqual({ owner: "user" });
    }
  }
  expect(await readFile(join(left.path, ".env.example"), "utf8")).not.toMatch(
    /LACE_AUTH_SECRET=\S/u,
  );
});

test("optional Cloudflare files are managed only when selected", async () => {
  const parent = await root();
  const project = await generateProject({ target: join(parent, "cloud-site"), cloudflare: true });
  expect(project.manifest.files["wrangler.jsonc"]?.owner).toBe("managed");
  expect(project.manifest.files[".github/workflows/cloudflare.yml"]?.owner).toBe("managed");
  expect(await listFiles(project.path)).toContain(".github/workflows/cloudflare.yml");
});

test("alpha generation selects exact compatible packages and overridable images", async () => {
  const parent = await root();
  const project = await generateProject({ target: join(parent, "alpha-site") });
  for (const file of ["package.json", "site/package.json"]) {
    const manifest = JSON.parse(await readFile(join(project.path, file), "utf8"));
    for (const [name, version] of Object.entries(manifest.dependencies)) {
      if (name.startsWith("@lacecms/")) expect(version).toBe("0.1.0-alpha.1");
    }
  }
  const environment = await readFile(join(project.path, ".env.example"), "utf8");
  expect(environment).toContain("LACE_API_IMAGE=ghcr.io/lacecms/api:0.1.0-alpha.1");
  expect(environment).toContain("LACE_BUILDER_IMAGE=ghcr.io/lacecms/builder:0.1.0-alpha.1");
  expect(TEMPLATE_VERSION).toBe("0.4.0");
  const compose = await readFile(join(project.path, "docker-compose.yml"), "utf8");
  expect(compose).toContain("image: ${LACE_API_IMAGE:");
  expect(compose).toContain("image: ${LACE_BUILDER_IMAGE:");
  expect(await readFile(join(project.path, "docs/lace-operations.md"), "utf8")).toContain(
    "pnpm create lace@0.1.0-alpha.1",
  );
});

test("arbitrary directory names produce safe package names", async () => {
  const parent = await root();
  const project = await generateProject({ target: join(parent, "2026 My Site") });
  const rootPackage = JSON.parse(await readFile(join(project.path, "package.json"), "utf8"));
  expect(rootPackage.name).toBe("lace-2026-my-site");
});

test("init preserves allowed entries and rejects other entries and symlinks", async () => {
  const parent = await root();
  const target = join(parent, "existing-site");
  await mkdir(join(target, ".git"), { recursive: true });
  await writeFile(join(target, ".git/config"), "existing git configuration\n");
  await writeFile(join(target, "README.md"), "existing readme\n");
  await generateProject({ target });
  expect(await readFile(join(target, ".git/config"), "utf8")).toBe("existing git configuration\n");
  expect(await readFile(join(target, "README.md"), "utf8")).toBe("existing readme\n");
  expect(await readdir(target)).toContain("site");

  const blocked = join(parent, "blocked-site");
  await mkdir(blocked);
  await writeFile(join(blocked, "notes.txt"), "keep me");
  await expect(generateProject({ target: blocked })).rejects.toThrow(
    "unsupported entry: notes.txt",
  );
  expect(await readdir(blocked)).toEqual(["notes.txt"]);
  const linked = join(parent, "linked-site");
  await symlink(blocked, linked);
  await expect(generateProject({ target: linked })).rejects.toThrow("regular directory");
  const withLinkedReadme = join(parent, "readme-site");
  await mkdir(withLinkedReadme);
  await symlink(join(blocked, "notes.txt"), join(withLinkedReadme, "README.md"));
  await expect(generateProject({ target: withLinkedReadme })).rejects.toThrow("symbolic link");
});

test("CLI validates commands and init only accepts a literal dot", async () => {
  const parent = await root();
  const cwd = join(parent, "my-site");
  await mkdir(cwd);
  const out = [];
  const err = [];
  const stdout = { write: (value) => out.push(value) };
  const stderr = { write: (value) => err.push(value) };
  expect(await runCli(["init", "./"], cwd, stdout, stderr)).toBe(2);
  expect(await runCli(["create", "another-site", "--bad"], cwd, stdout, stderr)).toBe(2);
  expect(await runCli(["init", "."], cwd, stdout, stderr)).toBe(0);
  expect(await runCli(["second-site"], cwd, stdout, stderr)).toBe(0);
  expect(await readdir(join(cwd, "second-site"))).toContain("site");
  expect(out.join("")).toContain(cwd);
  expect(err.join("")).toContain("Usage:");
});

test("failed publication restores the exact original tree", async () => {
  const parent = await root();
  const target = join(parent, "existing-site");
  await mkdir(target);
  await writeFile(join(target, "LICENSE"), "original license\n");
  await expect(
    generateProject({
      target,
      afterBackup: async () => {
        throw new Error("injected publish error");
      },
    }),
  ).rejects.toThrow("injected publish error");
  expect(await readdir(target)).toEqual(["LICENSE"]);
  expect(await readFile(join(target, "LICENSE"), "utf8")).toBe("original license\n");
  expect(
    (await readdir(parent)).filter((file) => file.startsWith(`.${basename(target)}.lace-`)),
  ).toEqual([]);
});

test("staging failure leaves the existing target unchanged", async () => {
  const parent = await root();
  const target = join(parent, "existing-site");
  await mkdir(target);
  await writeFile(join(target, "LICENSE"), "original license\n");
  await expect(
    generateProject({
      target,
      beforePublish: async () => {
        throw new Error("injected staging error");
      },
    }),
  ).rejects.toThrow("injected staging error");
  expect(await readdir(target)).toEqual(["LICENSE"]);
  expect(
    (await readdir(parent)).filter((file) => file.startsWith(`.${basename(target)}.lace-`)),
  ).toEqual([]);
});
