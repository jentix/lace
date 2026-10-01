import { createReadStream } from "node:fs";
import { join } from "node:path";
import { lstat } from "node:fs/promises";
import { extractPackage, inspectPackage, verifyInventory, walk } from "./release-artifacts.mjs";

export function requireReleaseInventory(inventory, platform) {
  if (!inventory.complete || !inventory.publicationEligible || inventory.source.preview)
    throw new Error("Acceptance requires a complete clean-source release inventory");
  if (!inventory.release.platforms.includes(platform))
    throw new Error("Unsupported consumer platform");
  return Object.fromEntries(
    ["api", "builder"].map((kind) => {
      const image = inventory.images.find(
        (item) => item.kind === kind && item.platform === platform,
      );
      if (!image) throw new Error(`Missing consumer image: ${kind}`);
      return [kind, image];
    }),
  );
}

export function checkImageIdentity(metadata, record, inventory) {
  const labels = metadata.Config.Labels ?? {};
  if (
    metadata.Id !== record.imageId ||
    `${metadata.Os}/${metadata.Architecture}` !== record.platform ||
    labels["org.opencontainers.image.version"] !== inventory.release.version ||
    labels["org.opencontainers.image.revision"] !== inventory.source.revision ||
    labels["org.opencontainers.image.source"] !== inventory.release.sourceRepository
  )
    throw new Error(`Consumer image identity mismatch: ${record.kind}`);
}

export function assertSecretFree(bytes, secrets, surface) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (
    [...secrets].some((secret) => secret && buffer.includes(Buffer.from(secret))) ||
    (!buffer.includes(0) &&
      /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----\r?\n[A-Za-z0-9+/=\r\n]{64,}-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u.test(
        buffer.toString("utf8"),
      ))
  )
    throw new Error(`Secret material detected in ${surface}`);
}

export function assertImageFileList(listing, kind) {
  for (const rawPath of listing.split("\n")) {
    const path = rawPath.replace(/^\.\//u, "");
    // The pinned Node base ships npm's own non-auth configuration. Its
    // contents are checked separately, like all npm configuration in the image.
    if (path === "usr/local/lib/node_modules/npm/.npmrc") continue;
    if (/(?:^|\/)(?:\.npmrc|\.aws|\.ssh|\.git)(?:\/|$)|(?:^|\/)\.env$/u.test(path))
      throw new Error(`Credential storage found in ${kind} image`);
  }
}

export async function scanFile(path, secrets, surface) {
  const overlap = Math.max(16 * 1024, ...[...secrets].map((secret) => Buffer.byteLength(secret)));
  let tail = Buffer.alloc(0);
  for await (const chunk of createReadStream(path)) {
    const bytes = Buffer.concat([tail, chunk]);
    assertSecretFree(bytes, secrets, surface);
    tail = bytes.subarray(-overlap);
  }
}

export async function scanTree(root, secrets, surface) {
  for (const file of await walk(root)) {
    if ((await lstat(join(root, file))).isFile())
      await scanFile(join(root, file), secrets, `${surface}: ${file}`);
  }
}

export async function loadConsumerArtifacts(directory, destination, platform) {
  const inventory = await verifyInventory(directory);
  const images = requireReleaseInventory(inventory, platform);
  const tarballs = new Map();
  const extracted = [];
  let generator;
  for (const record of inventory.packages) {
    const archive = join(directory, record.file);
    const root = await extractPackage(
      archive,
      join(destination, record.name.replace("@lacecms/", "")),
    );
    const manifest = await inspectPackage(root, inventory.release);
    if (manifest.name !== record.name || manifest.version !== record.version)
      throw new Error("Consumer package identity mismatch");
    tarballs.set(record.name, archive);
    extracted.push(root);
    if (record.name === "create-lace") generator = join(root, "dist/bin.js");
  }
  if (!generator) throw new Error("Missing packed generator");
  return { inventory, images, tarballs, extracted, generator };
}
