import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import { join, parse, resolve } from "node:path";

export type Ownership =
  | { readonly owner: "user" }
  | { readonly owner: "managed"; readonly sha256: string };
export interface UpgradeManifest {
  readonly schemaVersion: 1;
  readonly templateVersion: string;
  readonly files: Readonly<Record<string, Ownership>>;
}

export class UpgradeError extends Error {
  public constructor(
    readonly code:
      | "UPGRADE_INPUT"
      | "UPGRADE_INSPECTION"
      | "UPGRADE_BUSY"
      | "UPGRADE_RECOVERY"
      | "UPGRADE_APPLY",
    message: string,
  ) {
    super(message);
    this.name = "UpgradeError";
  }
}

function invalid(message: string): never {
  throw new UpgradeError("UPGRADE_INPUT", message);
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function keys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return (
    Object.keys(value).length === expected.length &&
    expected.every((key) => Object.hasOwn(value, key))
  );
}

export function isUserSource(path: string): boolean {
  const normalized = path.toLowerCase();
  return normalized === "site" || normalized.startsWith("site/") || normalized === "lace.config.ts";
}

function safePath(path: string): boolean {
  return (
    path.length > 0 &&
    !/[\\:]/u.test(path) &&
    [...path].every(
      (character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127,
    ) &&
    path
      .split("/")
      .every(
        (part) =>
          part.length > 0 &&
          ![".", "..", ".lace", "__proto__", "prototype", "constructor"].includes(
            part.toLowerCase(),
          ),
      )
  );
}

export function validateUpgradeManifest(value: unknown): UpgradeManifest {
  if (!record(value) || !keys(value, ["schemaVersion", "templateVersion", "files"]))
    invalid("Invalid upgrade manifest shape.");
  if (value.schemaVersion !== 1)
    invalid(
      "Unsupported manifest schemaVersion; this CLI supports version 1. Use a compatible CLI.",
    );
  if (
    typeof value.templateVersion !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._+-]{0,127}$/u.test(value.templateVersion)
  )
    invalid("Invalid manifest templateVersion.");
  if (!record(value.files)) invalid("Invalid manifest files inventory.");
  const files: Record<string, Ownership> = Object.create(null) as Record<string, Ownership>;
  for (const path of Object.keys(value.files).sort()) {
    if (!safePath(path)) invalid("Manifest contains an unsafe file path.");
    const entry = value.files[path];
    if (!record(entry)) invalid("Invalid manifest ownership record.");
    if (entry.owner === "user" && keys(entry, ["owner"])) files[path] = { owner: "user" };
    else if (
      entry.owner === "managed" &&
      keys(entry, ["owner", "sha256"]) &&
      typeof entry.sha256 === "string" &&
      /^[0-9a-f]{64}$/u.test(entry.sha256) &&
      !isUserSource(path)
    )
      files[path] = { owner: "managed", sha256: entry.sha256 };
    else
      invalid(
        "Invalid manifest ownership or managed-file hash; site/ and lace.config.ts must be user-owned.",
      );
  }
  for (const path of Object.keys(files)) {
    const parts = path.split("/");
    for (let index = 1; index < parts.length; index += 1) {
      if (Object.hasOwn(files, parts.slice(0, index).join("/")))
        invalid("Manifest file paths overlap.");
    }
  }
  return { schemaVersion: 1, templateVersion: value.templateVersion, files };
}

export function upgradeHash(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Check ancestors as well as the leaf; missing working files are meaningful. */
export async function readUpgradeFile(root: string, path: string): Promise<Buffer | undefined> {
  const absolute = resolve(root, path);
  const parts = absolute.slice(parse(absolute).root.length).split("/");
  let cursor = parse(absolute).root;
  try {
    for (const [index, part] of parts.entries()) {
      cursor = join(cursor, part);
      let stat;
      try {
        stat = await lstat(cursor);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
        throw error;
      }
      if (stat.isSymbolicLink()) invalid("Upgrade paths must not contain symbolic links.");
      if (index < parts.length - 1 ? !stat.isDirectory() : !stat.isFile())
        invalid("Upgrade paths must use regular files and directories.");
    }
    const file = await open(
      absolute,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    try {
      if (!(await file.stat()).isFile()) invalid("Upgrade input must be a regular file.");
      return await file.readFile();
    } finally {
      await file.close();
    }
  } catch (error) {
    if (error instanceof UpgradeError) throw error;
    throw new UpgradeError(
      "UPGRADE_INSPECTION",
      "Cannot inspect upgrade inputs. Check directory access and retry.",
    );
  }
}

export async function readUpgradeManifest(root: string): Promise<UpgradeManifest> {
  const bytes = await readUpgradeFile(root, ".lace/manifest.json");
  if (bytes === undefined)
    invalid("Missing .lace/manifest.json; select a generated project/template directory.");
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    invalid("Upgrade manifest is not valid JSON.");
  }
  return validateUpgradeManifest(value);
}

export async function readTargetTemplate(
  root: string,
  manifest: UpgradeManifest,
): Promise<ReadonlyMap<string, Buffer>> {
  const bytes = new Map<string, Buffer>();
  for (const [path, entry] of Object.entries(manifest.files)) {
    if (entry.owner === "user") continue;
    const content = await readUpgradeFile(root, path);
    if (content === undefined || upgradeHash(content) !== entry.sha256)
      invalid(
        "Target template bytes do not match its manifest. Select a pristine template directory.",
      );
    bytes.set(path, content);
  }
  return bytes;
}
