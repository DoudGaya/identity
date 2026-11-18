import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', fullyParallel: false, workers: 1,
  use: { baseURL: 'http://127.0.0.1:3004', trace: 'retain-on-failure', screenshot: 'only-on-failure', launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }, { name: 'mobile', use: { ...devices['Pixel 7'] } }],
  webServer: { command: 'node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3004', url: 'http://127.0.0.1:3004', reuseExistingServer: false, timeout: 120000, env: { IDENTITY_PORTAL_MODE: 'staging', IDENTITY_WEB_ORIGIN: 'http://127.0.0.1:3004', IDENTITY_IDENTIFIER_PROVIDER: 'fims', IDENTITY_BIOMETRIC_MODE: 'self-hosted' } },
});
