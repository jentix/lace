import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  vite: { envDir: "..", envPrefix: ["VITE_", "LACE_PUBLIC_"] },
});
