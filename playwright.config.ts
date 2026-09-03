import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 2 : 0,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
  webServer: [
    {
      command:
        'cross-env PORT=8788 DOCAYA_ENV=development AUTH_MODE=development LOCAL_SQLITE_ENABLED=true SQLITE_PATH=data/docaya-e2e.sqlite CORS_ALLOWED_ORIGINS=http://127.0.0.1:4173 node server/app/index.mjs',
      url: 'http://127.0.0.1:8788/health/live',
      reuseExistingServer: false,
    },
    {
      command: 'cross-env DOCAYA_API_PROXY=http://127.0.0.1:8788 vite --host 127.0.0.1 --port 4173',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
    },
  ],
})
