import { defineConfig, devices } from '@playwright/test'

const previewUrl = 'http://127.0.0.1:4173'

export default defineConfig({
  testDir: './e2e',
  workers: 2,
  forbidOnly: !!process.env.CI,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: previewUrl,
    trace: 'retain-on-failure',
    storageState: { cookies: [], origins: [] },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7 landscape'] },
    },
  ],
  webServer: {
    command:
      'npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: previewUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
