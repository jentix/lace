import { defineConfig } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const acceptance = process.env.LACE_ACCEPTANCE === "1";
const acceptanceState = acceptance
  ? (JSON.parse(
      readFileSync(resolve(import.meta.dirname, "../../.lace-acceptance/state.json"), "utf8"),
    ) as { port: number })
  : undefined;

export default defineConfig({
  testDir: "./src",
  testMatch: acceptance ? "acceptance.e2e.ts" : "editor.e2e.ts",
  use: { baseURL: `http://127.0.0.1:${acceptanceState?.port ?? 4173}` },
  webServer: acceptance
    ? undefined
    : {
        command: "pnpm exec vite --host 127.0.0.1 --port 4173",
        port: 4173,
        reuseExistingServer: !process.env.CI,
      },
});
