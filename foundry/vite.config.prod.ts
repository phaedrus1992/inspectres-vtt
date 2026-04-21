import { defineConfig } from "vite";
import baseConfig from "./vite.config.ts";

export default defineConfig({
  ...baseConfig,
  build: {
    ...baseConfig.build,
    sourcemap: false,
  },
});
