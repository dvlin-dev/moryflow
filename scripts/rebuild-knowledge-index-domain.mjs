#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseArgs, parseEnv as parseNodeEnv } from 'node:util';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, '..');
const DEFAULT_MORYFLOW_ENV_FILE =
  process.env.MORYFLOW_KNOWLEDGE_REBUILD_ENV_FILE?.trim() ||
  path.join(ROOT_DIR, 'apps/moryflow/server/.env');
const HTTP_REPLAY_BATCH_LIMIT = 10;
const HTTP_REPLAY_MAX_BATCHES = 1;

function printHelp() {
  console.log(`Usage: node scripts/rebuild-knowledge-index-domain.mjs [options]

Rebuild the knowledge indexing domain by re-enqueueing canonical workspace documents
through the Moryflow -> Memox write chain and draining the workspace-content outbox.
Default mode is dry-run. No network requests are issued unless --execute is passed.

Options:
  --execute                          Execute the rebuild
  --moryflow-env <path>              Moryflow server env file
  --base-url <url>                   Moryflow server base URL (defaults to SERVER_URL)
  --workspace-id <uuid>              Rebuild a single workspace only
  --limit <count>                    Cap the number of canonical documents to enqueue
  --max-rounds <count>               Maximum replay rounds (default: 20)
  --batch-size <count>               Replay batch size (default: 10, max: 10)
  --max-batches <count>              Replay max batches per round (default: 1, max: 1)
  --lease-ms <count>                 Replay lease ms (default: 60000)
  --redrive-dead-letter-limit <n>    Optional DLQ redrive count per round (default: 0)
  --consumer-id <id>                 Replay consumer id
  -h, --help                         Show this help
`);
}

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

    entries[key] = stripWrappingQuotes(rawValue)
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t');
  }

  return entries;
}

function parseEnvFileContent(content) {
  if (typeof parseNodeEnv === 'function') {
    return parseNodeEnv(content);
  }

  return parseFallbackEnv(content);
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Environment file not found: ${filePath}`);
  }

  return {
    ...parseEnvFileContent(fs.readFileSync(filePath, 'utf8')),
    ...process.env,
  };
}

function ensureRequiredKeys(scope, env, keys) {
  const missing = keys.filter((key) => !trimEnv(env[key]));
  if (missing.length > 0) {
    throw new Error(`${scope} env missing required keys: ${missing.join(', ')}`);
  }
}

function normalizeBaseUrl(raw) {
  const value = trimEnv(raw).replace(/\/+$/u, '');
  if (!value) {
    return '';
  }

  return value.endsWith('/api/v1') ? value.slice(0, -'/api/v1'.length) : value;
}

async function postJson(baseUrl, pathname, token, payload) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const bodyText = await response.text();
  const parsedBody = bodyText ? JSON.parse(bodyText) : null;

  if (!response.ok) {
    const detail =
      parsedBody && typeof parsedBody === 'object' ? JSON.stringify(parsedBody) : bodyText;
    throw new Error(
      `Request failed: ${response.status} ${response.statusText}${detail ? ` - ${detail}` : ''}`
    );
  }

  return parsedBody;
}

function printPlan({ execute, envFile, baseUrl, workspaceId, limit, maxRounds, replayPayload }) {
  console.log(`[knowledge-index-rebuild] mode=${execute ? 'execute' : 'dry-run'}`);
  console.log(`[knowledge-index-rebuild] moryflow env=${envFile}`);
  console.log(`[knowledge-index-rebuild] target=${baseUrl}`);
  console.log(
    `[knowledge-index-rebuild] rebuild payload=${JSON.stringify(
      {
        ...(workspaceId ? { workspaceId } : {}),
        ...(typeof limit === 'number' ? { limit } : {}),
      },
      null,
      2
    )}`
  );
  console.log(`[knowledge-index-rebuild] replay payload=${JSON.stringify(replayPayload, null, 2)}`);
  console.log(`[knowledge-index-rebuild] maxRounds=${maxRounds}`);
}

async function main() {
  const { values } = parseArgs({
    options: {
      execute: {
        type: 'boolean',
        default: false,
      },
      'moryflow-env': {
        type: 'string',
      },
      'base-url': {
        type: 'string',
      },
      'workspace-id': {
        type: 'string',
      },
      limit: {
        type: 'string',
      },
      'max-rounds': {
        type: 'string',
      },
      'batch-size': {
        type: 'string',
      },
      'max-batches': {
        type: 'string',
      },
      'lease-ms': {
        type: 'string',
      },
      'redrive-dead-letter-limit': {
        type: 'string',
      },
      'consumer-id': {
        type: 'string',
      },
      help: {
        type: 'boolean',
        short: 'h',
        default: false,
      },
    },
    allowPositionals: false,
  });

  if (values.help) {
    printHelp();
    return;
  }

  const envFile = path.resolve(values['moryflow-env'] ?? DEFAULT_MORYFLOW_ENV_FILE);
  const env = loadEnvFile(envFile);
  ensureRequiredKeys('Moryflow internal rebuild', env, ['SERVER_URL']);

  const baseUrl = normalizeBaseUrl(values['base-url'] ?? env.SERVER_URL);
  if (!baseUrl) {
    throw new Error('Resolved base URL is empty');
  }

  const limit = values.limit ? Number.parseInt(values.limit, 10) : undefined;
  const maxRounds = values['max-rounds'] ? Number.parseInt(values['max-rounds'], 10) : 20;
  const replayPayload = {
    batchSize: values['batch-size']
      ? Number.parseInt(values['batch-size'], 10)
      : HTTP_REPLAY_BATCH_LIMIT,
    maxBatches: values['max-batches']
      ? Number.parseInt(values['max-batches'], 10)
      : HTTP_REPLAY_MAX_BATCHES,
    leaseMs: values['lease-ms'] ? Number.parseInt(values['lease-ms'], 10) : 60_000,
    redriveDeadLetterLimit: values['redrive-dead-letter-limit']
      ? Number.parseInt(values['redrive-dead-letter-limit'], 10)
      : 0,
    ...(trimEnv(values['consumer-id']) ? { consumerId: trimEnv(values['consumer-id']) } : {}),
  };

  if (Number.isNaN(limit)) {
    throw new Error('Invalid --limit value');
  }
  if (!Number.isInteger(maxRounds) || maxRounds <= 0) {
    throw new Error('Invalid --max-rounds value');
  }
  for (const [key, value] of Object.entries(replayPayload)) {
    if (
      typeof value === 'number' &&
      (!Number.isInteger(value) || value < 0 || Number.isNaN(value))
    ) {
      throw new Error(`Invalid replay option: ${key}`);
    }
  }
  if (replayPayload.batchSize > HTTP_REPLAY_BATCH_LIMIT) {
    throw new Error(`Invalid --batch-size value: must be <= ${HTTP_REPLAY_BATCH_LIMIT}`);
  }
  if (replayPayload.maxBatches > HTTP_REPLAY_MAX_BATCHES) {
    throw new Error(`Invalid --max-batches value: must be <= ${HTTP_REPLAY_MAX_BATCHES}`);
  }

  printPlan({
    execute: values.execute,
    envFile,
    baseUrl,
    workspaceId: trimEnv(values['workspace-id']) || undefined,
    limit,
    maxRounds,
    replayPayload,
  });

  if (!values.execute) {
    console.log(
      '[knowledge-index-rebuild] dry-run only. Re-run with --execute to enqueue canonical documents and drain the outbox.'
    );
    return;
  }

  ensureRequiredKeys('Moryflow internal rebuild execution', env, ['INTERNAL_API_TOKEN']);

  const rebuildPayload = {
    ...(trimEnv(values['workspace-id']) ? { workspaceId: trimEnv(values['workspace-id']) } : {}),
    ...(typeof limit === 'number' ? { limit } : {}),
  };

  const rebuildResult = await postJson(
    baseUrl,
    '/internal/sync/memox/workspace-content/rebuild',
    env.INTERNAL_API_TOKEN,
    rebuildPayload
  );
  console.log(
    `[knowledge-index-rebuild] enqueued ${rebuildResult.enqueuedCount ?? 0} canonical document(s)`
  );

  let finalReplayResult = null;
  for (let round = 1; round <= maxRounds; round += 1) {
    const replayResult = await postJson(
      baseUrl,
      '/internal/sync/memox/workspace-content/replay',
      env.INTERNAL_API_TOKEN,
      replayPayload
    );
    finalReplayResult = replayResult;

    console.log(
      `[knowledge-index-rebuild] replay round ${round}: claimed=${replayResult.claimed}, acknowledged=${replayResult.acknowledged}, pending=${replayResult.pendingCount}, deadLettered=${replayResult.deadLetteredCount}, drained=${replayResult.drained}`
    );

    if (replayResult.drained) {
      break;
    }

    if (replayResult.claimed === 0 && replayResult.redrivenCount === 0) {
      console.log(
        '[knowledge-index-rebuild] replay made no progress; stopping early with backlog still present'
      );
      break;
    }
  }

  if (!finalReplayResult) {
    throw new Error('Replay did not run');
  }

  if (!finalReplayResult.drained) {
    throw new Error(
      `Outbox not drained: pending=${finalReplayResult.pendingCount}, deadLettered=${finalReplayResult.deadLetteredCount}`
    );
  }

  console.log('[knowledge-index-rebuild] completed');
}

main().catch((error) => {
  console.error('[knowledge-index-rebuild] failed');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
