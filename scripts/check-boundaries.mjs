import { existsSync, readdirSync, readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createScanner, SyntaxKind } from "typescript/unstable/ast";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultRoot = resolve(scriptDirectory, "..");
const sourceExtensions = new Set([".ts", ".tsx", ".mts", ".cts"]);
const nodeBuiltinModules = new Set(
  builtinModules.map((moduleName) => moduleName.replace(/^node:/, "")),
);

const allowedDependencies = new Map([
  ["@lacecms/config", new Set(["@lacecms/content"])],
  ["@lacecms/domain", new Set(["@lacecms/content"])],
  ["@lacecms/application", new Set(["@lacecms/domain", "@lacecms/content", "@lacecms/config"])],
  ["@lacecms/contracts", new Set(["@lacecms/domain", "@lacecms/content"])],
  ["@lacecms/db", new Set(["@lacecms/application", "@lacecms/domain"])],
  ["@lacecms/auth", new Set(["@lacecms/application", "@lacecms/domain"])],
  ["@lacecms/server", new Set(["@lacecms/application", "@lacecms/contracts", "@lacecms/auth"])],
  ["@lacecms/sdk", new Set(["@lacecms/contracts"])],
  [
    "@lacecms/platform-cloudflare",
    new Set([
      "@lacecms/application",
      "@lacecms/server",
      "@lacecms/db",
      "@lacecms/auth",
      "@lacecms/config",
    ]),
  ],
  [
    "@lacecms/platform-node",
    new Set([
      "@lacecms/application",
      "@lacecms/server",
      "@lacecms/db",
      "@lacecms/auth",
      "@lacecms/config",
    ]),
  ],
  [
    "@lacecms/cli",
    new Set([
      "@lacecms/application",
      "@lacecms/config",
      "@lacecms/platform-cloudflare",
      "@lacecms/platform-node",
    ]),
  ],
  [
    "@lacecms/app-api",
    new Set(["@lacecms/platform-cloudflare", "@lacecms/platform-node", "@lacecms/server"]),
  ],
  ["@lacecms/app-admin", new Set(["@lacecms/contracts", "@lacecms/content"])],
  ["@lacecms/app-site", new Set(["@lacecms/sdk", "@lacecms/content"])],
]);

function collectFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(entryPath));
    if (entry.isFile() && sourceExtensions.has(extname(entry.name))) files.push(entryPath);
  }
  return files;
}

function readMembers(rootDirectory) {
  const members = [];
  for (const group of ["apps", "packages"]) {
    const groupDirectory = join(rootDirectory, group);
    if (!existsSync(groupDirectory)) continue;
    for (const entry of readdirSync(groupDirectory, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const directory = join(groupDirectory, entry.name);
      const manifest = JSON.parse(readFileSync(join(directory, "package.json"), "utf8"));
      members.push({ directory, name: manifest.name, sourceDirectory: join(directory, "src") });
    }
  }
  return members;
}

function importsIn(filePath) {
  const imports = [];
  const scanner = createScanner(true, undefined, readFileSync(filePath, "utf8"));
  let token = scanner.scan();

  while (token !== SyntaxKind.EndOfFile) {
    if (token === SyntaxKind.ImportKeyword) {
      token = scanner.scan();
      if (token === SyntaxKind.StringLiteral) imports.push(scanner.getTokenValue());
      if (token === SyntaxKind.OpenParenToken) {
        token = scanner.scan();
        continue;
      }
      while (token !== SyntaxKind.EndOfFile && token !== SyntaxKind.SemicolonToken) {
        if (token === SyntaxKind.FromKeyword && scanner.scan() === SyntaxKind.StringLiteral) {
          imports.push(scanner.getTokenValue());
          break;
        }
        token = scanner.scan();
      }
    } else if (token === SyntaxKind.ExportKeyword) {
      while (token !== SyntaxKind.EndOfFile && token !== SyntaxKind.SemicolonToken) {
        if (token === SyntaxKind.FromKeyword && scanner.scan() === SyntaxKind.StringLiteral) {
          imports.push(scanner.getTokenValue());
          break;
        }
        token = scanner.scan();
      }
    }
    token = scanner.scan();
  }
  return imports;
}

function isNodeBuiltin(specifier) {
  return specifier.startsWith("node:") || nodeBuiltinModules.has(specifier);
}

function isOutside(sourceDirectory, filePath, specifier) {
  const target = resolve(dirname(filePath), specifier);
  const sourceRelativePath = relative(sourceDirectory, target);
  return (
    sourceRelativePath === ".." ||
    sourceRelativePath.startsWith(`..${sep}`) ||
    sourceRelativePath.startsWith("../")
  );
}

function assertNoCycles(graph) {
  const visiting = new Set();
  const visited = new Set();
  const visit = (member, path) => {
    if (visiting.has(member))
      throw new Error(`dependency cycle: ${[...path, member].join(" -> ")}`);
    if (visited.has(member)) return;
    visiting.add(member);
    for (const dependency of graph.get(member) ?? []) visit(dependency, [...path, member]);
    visiting.delete(member);
    visited.add(member);
  };
  for (const member of graph.keys()) visit(member, []);
}

export function checkBoundaries(rootDirectory = defaultRoot) {
  const members = readMembers(rootDirectory);
  const memberNames = new Set(members.map((member) => member.name));
  const graph = new Map(members.map((member) => [member.name, new Set()]));

  for (const member of members) {
    for (const filePath of collectFiles(member.sourceDirectory)) {
      for (const specifier of importsIn(filePath)) {
        if (specifier.startsWith(".")) {
          if (isOutside(member.sourceDirectory, filePath, specifier)) {
            throw new Error(`cross-package source-path import in ${filePath}: ${specifier}`);
          }
          continue;
        }
        if (
          ["@lacecms/content", "@lacecms/config"].includes(member.name) &&
          isNodeBuiltin(specifier)
        ) {
          throw new Error(`Node builtin import in portable package ${member.name}: ${specifier}`);
        }
        if (!memberNames.has(specifier)) continue;
        if (!allowedDependencies.get(member.name)?.has(specifier)) {
          throw new Error(`forbidden dependency: ${member.name} -> ${specifier}`);
        }
        graph.get(member.name).add(specifier);
      }
    }
  }
  assertNoCycles(graph);
}

if (resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  checkBoundaries(process.argv[2] ? resolve(process.argv[2]) : defaultRoot);
}
