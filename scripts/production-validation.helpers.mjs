import fs from 'node:fs';

const VALIDATION_MODES = new Set(['all', 'memox', 'cloud-sync']);

function trimEnv(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function resolveValidationMode(rawMode) {
  const mode = trimEnv(rawMode) || 'all';
  if (!VALIDATION_MODES.has(mode)) {
    throw new Error(`Unsupported validation phase: ${mode}`);
  }
  return mode;
}

export function normalizeProductionValidationEnv(env) {
  const normalized = { ...env };

  if (!trimEnv(normalized.MORYFLOW_SERVER_BASE_URL) && trimEnv(normalized.SERVER_URL)) {
    normalized.MORYFLOW_SERVER_BASE_URL = trimEnv(normalized.SERVER_URL);
  }

  if (
    !trimEnv(normalized.MORYFLOW_E2E_USER_DATA) &&
    trimEnv(normalized.MORYFLOW_PC_USER_DATA_DIR)
  ) {
    normalized.MORYFLOW_E2E_USER_DATA = trimEnv(normalized.MORYFLOW_PC_USER_DATA_DIR);
  }

  if (!trimEnv(normalized.ANYHUNT_BASE_URL) && trimEnv(normalized.ANYHUNT_API_BASE_URL)) {
    normalized.ANYHUNT_BASE_URL = `${trimEnv(normalized.ANYHUNT_API_BASE_URL).replace(/\/$/, '')}/api/v1`;
  }

  if (!trimEnv(normalized.ANYHUNT_OPENAPI_URL) && trimEnv(normalized.ANYHUNT_API_BASE_URL)) {
    normalized.ANYHUNT_OPENAPI_URL = `${trimEnv(normalized.ANYHUNT_API_BASE_URL).replace(/\/$/, '')}/openapi.json`;
  }

  return normalized;
}

export function validateProductionValidationEnv(env, mode) {
  const normalized = normalizeProductionValidationEnv(env);
  const required = new Set(['ANYHUNT_API_BASE_URL', 'ANYHUNT_API_KEY']);

  if (mode === 'cloud-sync' || mode === 'all') {
    required.add('MORYFLOW_E2E_USER_DATA');
    required.add('MORYFLOW_VALIDATION_WORKSPACE');
    required.add('MORYFLOW_SERVER_BASE_URL');
  }

  for (const key of required) {
    if (!trimEnv(normalized[key])) {
      throw new Error(`${key} is required for ${mode} validation`);
    }
  }

  return normalized;
}

export function collectEnvFiles(env) {
  const files = [
    trimEnv(env.MORYFLOW_SERVER_ENV_FILE),
    trimEnv(env.ANYHUNT_SERVER_ENV_FILE),
  ].filter(Boolean);

  return [...new Set(files)];
}

export function ensureEnvFilesExist(files) {
  for (const file of files) {
    if (!fs.existsSync(file)) {
      throw new Error(`Environment file not found: ${file}`);
    }
  }
}

export function buildValidationCommands(mode) {
  const commands = [];

  if (mode === 'memox' || mode === 'all') {
    commands.push({
      label: 'memox-openapi-load-check',
      command: 'pnpm --filter @anyhunt/anyhunt-server run memox:phase2:openapi-load-check',
    });
    commands.push({
      label: 'memox-production-smoke',
      command: 'pnpm --filter @anyhunt/anyhunt-server run memox:production:smoke',
    });
  }

  if (mode === 'cloud-sync' || mode === 'all') {
    commands.push({
      label: 'cloud-sync-production-harness',
      command: 'pnpm --filter @moryflow/pc run test:e2e:cloud-sync-production',
    });
  }

  return commands;
}
