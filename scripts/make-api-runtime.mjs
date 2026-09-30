import { copyFile, mkdir, realpath, symlink, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

// pnpm deploy creates an isolated production dependency tree. Add only the
// operational files and compatibility links that generated Compose needs.
const root = resolve(process.argv[2]);
const apiModules = join(root, "apps/api/node_modules");
const platform = await realpath(join(apiModules, "@lacecms/platform-node"));
await mkdir(join(root, "packages"), { recursive: true });
await symlink(relative(join(root, "packages"), platform), join(root, "packages/platform-node"));
await mkdir(join(platform, "src"), { recursive: true });
await copyFile("packages/platform-node/src/minio-init.mjs", join(platform, "src/minio-init.mjs"));
await mkdir(join(root, "node_modules/@lacecms"), { recursive: true });
for (const name of ["config", "content", "domain", "platform-node"]) {
  const candidate = name === "platform-node" ? platform : join(dirname(platform), name);
  const target = await realpath(candidate);
  await symlink(
    relative(join(root, "node_modules/@lacecms"), target),
    join(root, "node_modules/@lacecms", name),
  );
}
await mkdir(join(root, "apps/api/src"), { recursive: true });
await copyFile("apps/api/src/dev-bootstrap.mjs", join(root, "apps/api/src/dev-bootstrap.mjs"));
await copyFile("lace.config.ts", join(root, "lace.config.ts"));
await copyFile("LICENSE", join(root, "LICENSE"));
await writeFile(join(root, "package.json"), JSON.stringify({ private: true, type: "module" }));
