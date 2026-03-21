import { defineConfig } from '@playwright/test';

const includeProductionValidation = process.env['MORYFLOW_INCLUDE_PRODUCTION_E2E'] === 'true';

export default defineConfig({
  testDir: './tests',
  testIgnore: includeProductionValidation ? [] : ['tests/cloud-sync-production-validation.spec.ts'],
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
