import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildValidationCommands,
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
