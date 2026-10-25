import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT ?? 5173)
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`

// E2E runs against the Vite dev server with the fake auth module (VITE_E2E=true) and
// `page.route` mocks for /api/*. Real Google / Firebase / Firestore are manual UAT cases.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npx vite --port ${PORT} --strictPort`,
        url: baseURL,
        env: { VITE_E2E: 'true' },
        reuseExistingServer: false,
        timeout: 60_000,
      },
})
