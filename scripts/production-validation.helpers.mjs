import fs from 'node:fs';
import { parseEnv as parseNodeEnv } from 'node:util';

const VALIDATION_MODES = new Set(['all', 'memox', 'cloud-sync']);

function trimEnv(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function stripWrappingQuotes(value) {
  if (value.length < 2) {
    return value;
  }

  const first = value[0];
  const last = value.at(-1);
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }

  return value;
}

function parseFallbackEnv(content) {
  const entries = {};
  const lines = content.split(/\r?\n/u);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const normalized = trimmed.startsWith('export ')
      ? trimmed.slice('export '.length).trim()
      : trimmed;
    const equalsIndex = normalized.indexOf('=');
    if (equalsIndex <= 0) {
      continue;
    }

    const key = normalized.slice(0, equalsIndex).trim();
    let rawValue = normalized.slice(equalsIndex + 1).trim();

    if (!rawValue) {
      entries[key] = '';
      continue;
    }

    const quoted = rawValue.startsWith('"') || rawValue.startsWith("'");
    if (!quoted) {
      rawValue = rawValue.replace(/\s+#.*$/u, '').trim();
    }

    const value = stripWrappingQuotes(rawValue)
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t');

    entries[key] = value;
  }

  return entries;
}

function parseEnvFileContent(content) {
  if (typeof parseNodeEnv === 'function') {
    return parseNodeEnv(content);
  }

  return parseFallbackEnv(content);
}

function mergeEnvEntries(targetEnv, entries) {
  for (const [key, value] of Object.entries(entries)) {
    if (targetEnv[key] === undefined) {
      targetEnv[key] = value;
    }
  }
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

export function loadProductionValidationEnvFiles(
  files,
  targetEnv = process.env,
  loadEnvFile = process.loadEnvFile
) {
  if (files.length === 0) {
    return;
  }

  if (typeof loadEnvFile === 'function') {
    for (const file of files) {
      loadEnvFile.call(process, file);
    }
    return;
  }

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    mergeEnvEntries(targetEnv, parseEnvFileContent(content));
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
