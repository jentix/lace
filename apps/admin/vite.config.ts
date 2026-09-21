import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/admin/",
  plugins: [react(), tailwindcss()],
  server: { allowedHosts: ["admin"] },
  test: {
    css: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
