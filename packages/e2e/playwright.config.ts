import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false, // Tests share seeded state, run sequentially
  retries: 0,
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: [
    {
      command: "bun run ../../packages/server/src/index.ts",
      port: 3000,
      reuseExistingServer: !process.env.CI,
      env: { DB_PATH: "/tmp/recipe-mgmt-e2e-test.db" },
    },
    {
      command: "bun run --cwd ../../packages/client dev",
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
