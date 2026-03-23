import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const productionValidationSpec = 'tests/cloud-sync-production-validation.spec.ts';
const packageJsonPath = path.resolve(import.meta.dirname, '../../../package.json');
const playwrightConfigPath = path.resolve(import.meta.dirname, '../../../playwright.config.ts');
const originalIncludeProductionE2E = process.env['MORYFLOW_INCLUDE_PRODUCTION_E2E'];

async function loadPlaywrightConfig() {
  const configUrl = pathToFileURL(playwrightConfigPath);
  const configModule = await import(`${configUrl.href}?t=${Date.now()}-${Math.random()}`);
  return configModule.default as { testIgnore?: string[] };
}

afterEach(() => {
  if (originalIncludeProductionE2E === undefined) {
    delete process.env['MORYFLOW_INCLUDE_PRODUCTION_E2E'];
    return;
  }

  process.env['MORYFLOW_INCLUDE_PRODUCTION_E2E'] = originalIncludeProductionE2E;
});

describe('desktop playwright e2e contracts', () => {
  it('excludes production cloud sync validation from the default e2e suite', async () => {
    delete process.env['MORYFLOW_INCLUDE_PRODUCTION_E2E'];

    const config = await loadPlaywrightConfig();

    expect(config.testIgnore).toContain(productionValidationSpec);
  }, 15000);

  it('allows the dedicated production cloud sync suite to opt back in explicitly', async () => {
    process.env['MORYFLOW_INCLUDE_PRODUCTION_E2E'] = 'true';

    const config = await loadPlaywrightConfig();

    expect(config.testIgnore ?? []).not.toContain(productionValidationSpec);
  });

  it('warms Electron native modules before running the dedicated production suite', async () => {
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.['pretest:e2e:cloud-sync-production']).toContain(
      'electron-rebuild -f -w better-sqlite3'
    );
    expect(packageJson.scripts?.['test:e2e:cloud-sync-production']).toContain(
      'MORYFLOW_INCLUDE_PRODUCTION_E2E=true'
    );
  });
});
