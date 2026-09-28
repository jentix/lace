import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Every case boots workerd through Miniflare; shared CI runners are several
    // times slower than a workstation while other packages test in parallel.
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
});
