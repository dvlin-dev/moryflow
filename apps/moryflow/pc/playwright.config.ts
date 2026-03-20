import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testIgnore: ['tests/cloud-sync-production-validation.spec.ts'],
  timeout: 60_000,
  expect: {
    timeout: 20_000,
  },
  workers: 1,
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
