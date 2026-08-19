import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    // Match the "@/..." imports the app uses.
    alias: { "@": path.resolve(process.cwd()) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    // Database-backed tests share one schema, so they must not race each other.
    fileParallelism: false,
    testTimeout: 20000,
    setupFiles: ["tests/setup.js"],
    globalSetup: ["tests/global-setup.js"],
  },
});
