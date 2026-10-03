import { cp, lstat, readFile } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";

export interface SourceSelection {
  readonly siteDirectory: string;
  readonly outputDirectory: string;
}

const skipped = new Set([
  ".git",
  "node_modules",
  "dist",
  ".astro",
  ".turbo",
  "coverage",
  "dev-data",
  ".lace-acceptance",
  ".release-artifacts",
  ".npmrc",
  ".pnpmfile.cjs",
  ".aws",
  ".ssh",
  ".agents",
  ".codex",
  ".claude",
  "test-results",
]);

export function validDirectory(value: string, root = false): boolean {
  return (
    (root && value === ".") ||
    (value.length > 0 &&
      value.length <= 1024 &&
      value
        .split("/")
        .every(
          (part) => part !== "." && part !== ".." && /^[A-Za-z0-9_.][A-Za-z0-9_. -]*$/u.test(part),
        ))
  );
}

async function regular(root: string, path: string, directory = false): Promise<void> {
  let current = root;
  const rootStat = await lstat(root);
  if (!rootStat.isDirectory()) throw new Error("source_invalid");
  for (const part of path.split("/")) {
    if (part === ".") continue;
    current = join(current, part);
    const stat = await lstat(current);
    if (stat.isSymbolicLink()) throw new Error("source_invalid");
  }
  const stat = await lstat(current);
  if (!(directory ? stat.isDirectory() : stat.isFile())) throw new Error("source_invalid");
}

export async function validateSource(root: string, selection: SourceSelection): Promise<void> {
  if (!validDirectory(selection.siteDirectory, true) || !validDirectory(selection.outputDirectory))
    throw new Error("source_invalid");
  await regular(root, "package.json");
  await regular(root, "pnpm-lock.yaml");
  await regular(root, selection.siteDirectory, true);
  await regular(root, join(selection.siteDirectory, "package.json"));
  const site = JSON.parse(
    await readFile(join(root, selection.siteDirectory, "package.json"), "utf8"),
  );
  if (typeof (site.dependencies?.astro ?? site.devDependencies?.astro) !== "string")
    throw new Error("source_invalid");
  if (selection.siteDirectory !== ".") {
    await regular(root, "pnpm-workspace.yaml");
    for (const file of ["pnpm-lock.yaml", "pnpm-workspace.yaml"]) {
      try {
        await lstat(join(root, selection.siteDirectory, file));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
        throw error;
      }
      throw new Error("source_invalid");
    }
  }
  // Output is always a descendant of the selected project and cannot replace its source.
  if (
    selection.outputDirectory
      .split("/")
      .some((part) => ["src", "public", "node_modules", ".git", ".lace"].includes(part))
  )
    throw new Error("source_invalid");
  let output = join(root, selection.siteDirectory);
  for (const part of selection.outputDirectory.split("/")) {
    output = join(output, part);
    try {
      if (!(await lstat(output)).isDirectory()) throw new Error("source_invalid");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") break;
      throw error;
    }
  }
}

export async function copySource(
  root: string,
  destination: string,
  selection: SourceSelection,
): Promise<void> {
  await validateSource(root, selection);
  const output = join(selection.siteDirectory, selection.outputDirectory);
  await cp(root, destination, {
    recursive: true,
    filter: async (source) => {
      const name = basename(source);
      const location = relative(root, source);
      const parts = location.split(sep);
      if (
        location === output ||
        location.startsWith(`${output}${sep}`) ||
        parts.some((part, index) => part === ".lace" && parts[index + 1] === "data") ||
        (source !== root && (skipped.has(name) || name === ".env" || name.startsWith(".env.")))
      )
        return false;
      const stat = await lstat(source);
      if (!stat.isDirectory() && !stat.isFile()) throw new Error("source_invalid");
      return true;
    },
  });
  await validateSource(destination, selection);
}

export function disjointRoots(roots: readonly string[]): boolean {
  const paths = roots.map((root) => resolve(root));
  return paths.every((path, index) =>
    paths.every(
      (other, otherIndex) =>
        index === otherIndex || (path !== other && !path.startsWith(`${other}${sep}`)),
    ),
  );
}
