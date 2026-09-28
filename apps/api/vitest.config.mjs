import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The Worker bundle and smoke files each run Wrangler and workerd; running
    // files one at a time keeps that load from starving parallel package tests.
    fileParallelism: false,
  },
});
