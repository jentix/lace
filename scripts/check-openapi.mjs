import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const artifact = "apps/api/openapi/api-v1.json";
const before = await readFile(artifact, "utf8");

execFileSync(process.execPath, ["apps/api/scripts/generate-openapi.mjs"], { stdio: "inherit" });
const after = await readFile(artifact, "utf8");
if (before !== after) {
  throw new Error(
    "Generated OpenAPI artifact was stale; regenerate and commit apps/api/openapi/api-v1.json.",
  );
}
execFileSync("git", ["diff", "--exit-code", "--", artifact], {
  stdio: "inherit",
});
