import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  // Deep Agent 2.0 optimized timeouts for long-running LLM operations
  timeout: 180 * 1000, // 3 minutes per test (delegation chains can be long)
  expect: {
    timeout: 30 * 1000, // 30s for assertions
  },

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Extended navigation timeout for initial app load
    navigationTimeout: 60 * 1000, // 60s for page navigation

    // Extended action timeout for agent interactions
    actionTimeout: 30 * 1000, // 30s for clicks, fills, etc.
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'fast-agent-integration',
      testMatch: '**/fast-agent-integration.spec.ts',
      timeout: 300 * 1000, // 5 minutes for Deep Agent workflows
      use: {
        ...devices['Desktop Chrome'],
        // Specific overrides for agent tests
        navigationTimeout: 90 * 1000,
        actionTimeout: 45 * 1000,
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

