import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  output: "static",
  vite: {
    server: { allowedHosts: ["site"] },
    // The reference workspace uses source packages. Direct Astro builds must
    // not depend on old dist files or invoke dependency package build scripts.
    resolve: {
      alias: Object.fromEntries(
        ["sdk", "contracts", "content", "domain"].map((name) => [
          `@lacecms/${name}`,
          fileURLToPath(new URL(`../../packages/${name}/src/index.ts`, import.meta.url)),
        ]),
      ),
    },
  },
});
