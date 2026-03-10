import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  buildValidationCommands,
  loadProductionValidationEnvFiles,
  resolveValidationMode,
  validateProductionValidationEnv,
} from './production-validation.helpers.mjs';

test('resolveValidationMode defaults to all', () => {
  assert.equal(resolveValidationMode(undefined), 'all');
});

test('resolveValidationMode accepts explicit phases', () => {
  assert.equal(resolveValidationMode('memox'), 'memox');
  assert.equal(resolveValidationMode('cloud-sync'), 'cloud-sync');
  assert.equal(resolveValidationMode('all'), 'all');
});

test('resolveValidationMode rejects invalid phase', () => {
  assert.throws(
    () => resolveValidationMode('bad-phase'),
    /Unsupported validation phase: bad-phase/
  );
});

test('validateProductionValidationEnv requires Anyhunt env for memox', () => {
  assert.throws(
    () =>
      validateProductionValidationEnv(
        {
          ANYHUNT_API_BASE_URL: 'https://server.anyhunt.app',
        },
        'memox'
      ),
    /ANYHUNT_API_KEY is required/
  );
});

test('validateProductionValidationEnv requires PC env for cloud-sync', () => {
  assert.throws(
    () =>
      validateProductionValidationEnv(
        {
          ANYHUNT_API_BASE_URL: 'https://server.anyhunt.app',
          ANYHUNT_API_KEY: 'ah_test',
          MORYFLOW_SERVER_BASE_URL: 'https://server.moryflow.com',
        },
        'cloud-sync'
      ),
    /MORYFLOW_E2E_USER_DATA is required/
  );
});

test('validateProductionValidationEnv accepts complete env for all phases', () => {
  assert.doesNotThrow(() =>
    validateProductionValidationEnv(
      {
        ANYHUNT_API_BASE_URL: 'https://server.anyhunt.app',
        ANYHUNT_API_KEY: 'ah_test',
        MORYFLOW_SERVER_BASE_URL: 'https://server.moryflow.com',
        MORYFLOW_E2E_USER_DATA: '/tmp/user-data',
        MORYFLOW_VALIDATION_WORKSPACE: '/tmp/workspace',
      },
      'all'
    )
  );
});

test('buildValidationCommands returns memox pipeline for memox phase', () => {
  assert.deepEqual(buildValidationCommands('memox'), [
    {
      label: 'memox-openapi-load-check',
      command: 'pnpm --filter @anyhunt/anyhunt-server run memox:phase2:openapi-load-check',
    },
    {
      label: 'memox-production-smoke',
      command: 'pnpm --filter @anyhunt/anyhunt-server run memox:production:smoke',
    },
  ]);
});

test('buildValidationCommands appends cloud-sync harness for all phase', () => {
  const commands = buildValidationCommands('all');

  assert.equal(commands.length, 3);
  assert.equal(commands.at(-1)?.label, 'cloud-sync-production-harness');
  assert.match(commands.at(-1)?.command ?? '', /@moryflow\/pc run test:e2e:cloud-sync-production/);
});

test('loadProductionValidationEnvFiles returns early when file list is empty', () => {
  const env = {};
  let called = false;

  assert.doesNotThrow(() =>
    loadProductionValidationEnvFiles([], env, () => {
      called = true;
    })
  );

  assert.equal(called, false);
  assert.deepEqual(env, {});
});

test('loadProductionValidationEnvFiles falls back when process.loadEnvFile is unavailable', async () => {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'production-validation-env-'));
  const envFile = path.join(tempDir, '.env');

  await fs.promises.writeFile(
    envFile,
    [
      'ANYHUNT_API_BASE_URL="https://server.anyhunt.app"',
      'ANYHUNT_API_KEY="ah_test"',
      'export MORYFLOW_SERVER_BASE_URL="https://server.moryflow.com"',
    ].join('\n'),
    'utf8'
  );

  const env = {
    ANYHUNT_API_KEY: 'ah_existing',
  };

  try {
    loadProductionValidationEnvFiles([envFile], env, null);

    assert.equal(env.ANYHUNT_API_BASE_URL, 'https://server.anyhunt.app');
    assert.equal(env.ANYHUNT_API_KEY, 'ah_existing');
    assert.equal(env.MORYFLOW_SERVER_BASE_URL, 'https://server.moryflow.com');
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
});
