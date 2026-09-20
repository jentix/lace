import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./src",
  testMatch: "editor.e2e.ts",
  use: { baseURL: "http://127.0.0.1:4173" },
  webServer: {
    command: "pnpm exec vite --host 127.0.0.1 --port 4173",
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
