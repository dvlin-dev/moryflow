#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { parseArgs, parseEnv as parseNodeEnv } from 'node:util';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, '..');
const DEFAULT_MORYFLOW_ENV_FILE =
  process.env.MORYFLOW_RESET_ENV_FILE?.trim() ||
  path.join(ROOT_DIR, 'apps/moryflow/server/.env');
const DEFAULT_ANYHUNT_ENV_FILE =
  process.env.ANYHUNT_RESET_ENV_FILE?.trim() ||
  path.join(ROOT_DIR, 'apps/anyhunt/server/.env');
const anyhuntServerRequire = createRequire(
  path.join(ROOT_DIR, 'apps/anyhunt/server/package.json')
);

function printHelp() {
  console.log(`Usage: node scripts/reset-rewrite-state.mjs [options]

Destructive reset/cleanup entry for the workspace-profile + memory/sync rewrite.
Default mode is dry-run. Nothing destructive happens unless --execute is passed.

Options:
  --execute                          Execute destructive reset and cleanup steps
  --moryflow-env <path>              Moryflow server env file
  --anyhunt-env <path>               Anyhunt server env file
  --skip-databases                   Skip PostgreSQL schema reset
  --skip-redis                       Skip Redis flushdb
  --skip-r2                          Skip R2 bucket cleanup
  --include-moryflow-sites-bucket    Also wipe R2_SITES_BUCKET_NAME when present
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

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Environment file not found: ${filePath}`);
  }

  return parseEnvFileContent(fs.readFileSync(filePath, 'utf8'));
}

function ensureRequiredKeys(scope, env, keys) {
  const missing = keys.filter((key) => !trimEnv(env[key]));
  if (missing.length > 0) {
    throw new Error(`${scope} env missing required keys: ${missing.join(', ')}`);
  }
}

function maskToken(value, visiblePrefix = 3, visibleSuffix = 2) {
  const normalized = trimEnv(value);
  if (!normalized) {
    return '<missing>';
  }

  if (normalized.length <= visiblePrefix + visibleSuffix) {
    return '*'.repeat(normalized.length);
  }

  return `${normalized.slice(0, visiblePrefix)}***${normalized.slice(
    -visibleSuffix
  )}`;
}

function maskConnectionString(raw) {
  try {
    const url = new URL(raw);
    const auth = url.username || url.password ? '***:***@' : '';
    const query = url.search ? '?…' : '';
    return `${url.protocol}//${auth}${url.host}${url.pathname}${query}`;
  } catch {
    return '<opaque connection string>';
  }
}

function buildR2Client(env) {
  const { S3Client } = loadPackageModule('@aws-sdk/client-s3');
  return new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
}

function buildOperations(options, moryflowEnv, anyhuntEnv) {
  const operations = [];

  if (!options.skipDatabases) {
    ensureRequiredKeys('Moryflow database', moryflowEnv, ['DATABASE_URL']);
    ensureRequiredKeys('Anyhunt main database', anyhuntEnv, ['DATABASE_URL']);
    ensureRequiredKeys('Anyhunt vector database', anyhuntEnv, [
      'VECTOR_DATABASE_URL',
    ]);

    operations.push({
      kind: 'postgres-reset',
      label: 'Moryflow main database',
      summary: maskConnectionString(moryflowEnv.DATABASE_URL),
      execute: async () => {
        await resetPostgresSchema(moryflowEnv.DATABASE_URL);
      },
    });
    operations.push({
      kind: 'postgres-reset',
      label: 'Anyhunt main database',
      summary: maskConnectionString(anyhuntEnv.DATABASE_URL),
      execute: async () => {
        await resetPostgresSchema(anyhuntEnv.DATABASE_URL);
      },
    });
    operations.push({
      kind: 'postgres-reset',
      label: 'Anyhunt vector database',
      summary: maskConnectionString(anyhuntEnv.VECTOR_DATABASE_URL),
      execute: async () => {
        await resetPostgresSchema(anyhuntEnv.VECTOR_DATABASE_URL);
      },
    });
  }

  if (!options.skipRedis) {
    ensureRequiredKeys('Moryflow Redis', moryflowEnv, ['REDIS_URL']);
    ensureRequiredKeys('Anyhunt Redis', anyhuntEnv, ['REDIS_URL']);

    const redisTargets = new Map();
    addRedisTarget(redisTargets, moryflowEnv.REDIS_URL, 'Moryflow Redis');
    addRedisTarget(redisTargets, anyhuntEnv.REDIS_URL, 'Anyhunt Redis');

    for (const [redisUrl, labels] of redisTargets.entries()) {
      operations.push({
        kind: 'redis-flushdb',
        label: labels.join(' + '),
        summary: maskConnectionString(redisUrl),
        execute: async () => {
          await flushRedis(redisUrl);
        },
      });
    }
  }

  if (!options.skipR2) {
    ensureRequiredKeys('Moryflow R2', moryflowEnv, [
      'R2_ACCOUNT_ID',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'R2_BUCKET_NAME',
    ]);
    ensureRequiredKeys('Anyhunt R2', anyhuntEnv, [
      'R2_ACCOUNT_ID',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'R2_BUCKET_NAME',
    ]);

    operations.push({
      kind: 'r2-wipe',
      label: 'Moryflow sync bucket',
      summary: summarizeBucket(moryflowEnv.R2_BUCKET_NAME, moryflowEnv.R2_ACCOUNT_ID),
      execute: async () => {
        const deletedCount = await wipeBucket(
          buildR2Client(moryflowEnv),
          moryflowEnv.R2_BUCKET_NAME
        );
        return `${deletedCount} object(s) deleted`;
      },
    });
    operations.push({
      kind: 'r2-wipe',
      label: 'Anyhunt primary bucket',
      summary: summarizeBucket(anyhuntEnv.R2_BUCKET_NAME, anyhuntEnv.R2_ACCOUNT_ID),
      execute: async () => {
        const deletedCount = await wipeBucket(
          buildR2Client(anyhuntEnv),
          anyhuntEnv.R2_BUCKET_NAME
        );
        return `${deletedCount} object(s) deleted`;
      },
    });

    if (options.includeMoryflowSitesBucket) {
      ensureRequiredKeys('Moryflow site publish bucket', moryflowEnv, [
        'R2_SITES_BUCKET_NAME',
      ]);
      operations.push({
        kind: 'r2-wipe',
        label: 'Moryflow sites bucket',
        summary: summarizeBucket(
          moryflowEnv.R2_SITES_BUCKET_NAME,
          moryflowEnv.R2_ACCOUNT_ID
        ),
        execute: async () => {
          const deletedCount = await wipeBucket(
            buildR2Client(moryflowEnv),
            moryflowEnv.R2_SITES_BUCKET_NAME
          );
          return `${deletedCount} object(s) deleted`;
        },
      });
    }
  }

  return operations;
}

function addRedisTarget(targets, redisUrl, label) {
  const key = trimEnv(redisUrl);
  const labels = targets.get(key) ?? [];
  labels.push(label);
  targets.set(key, labels);
}

function summarizeBucket(bucketName, accountId) {
  return `bucket=${bucketName}, account=${maskToken(accountId, 4, 4)}`;
}

function loadPackageModule(moduleName) {
  try {
    return anyhuntServerRequire(moduleName);
  } catch {
    throw new Error(
      `Cannot resolve ${moduleName}. Run this script from an installed workspace (for example after pnpm install).`
    );
  }
}

async function resetPostgresSchema(connectionString) {
  const { Client: PgClient } = loadPackageModule('pg');
  const client = new PgClient({ connectionString });
  await client.connect();

  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
  } finally {
    await client.end();
  }
}

async function flushRedis(redisUrl) {
  const Redis = loadPackageModule('ioredis');
  const redis = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
  });

  try {
    await redis.connect();
    await redis.flushdb();
    await redis.quit();
  } catch (error) {
    redis.disconnect();
    throw error;
  }
}

async function wipeBucket(client, bucketName) {
  const { ListObjectsV2Command, DeleteObjectsCommand } = loadPackageModule(
    '@aws-sdk/client-s3'
  );
  let continuationToken;
  let deletedCount = 0;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
      })
    );

    const objects = (response.Contents ?? [])
      .map((item) => item.Key)
      .filter(Boolean)
      .map((key) => ({ Key: key }));

    if (objects.length > 0) {
      for (let index = 0; index < objects.length; index += 1000) {
        const batch = objects.slice(index, index + 1000);
        await client.send(
          new DeleteObjectsCommand({
            Bucket: bucketName,
            Delete: {
              Objects: batch,
              Quiet: true,
            },
          })
        );
        deletedCount += batch.length;
      }
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return deletedCount;
}

function printPlan(options, moryflowEnvFile, anyhuntEnvFile, operations) {
  console.log(
    `[reset-rewrite] mode=${options.execute ? 'execute' : 'dry-run'}`
  );
  console.log(`[reset-rewrite] moryflow env=${moryflowEnvFile}`);
  console.log(`[reset-rewrite] anyhunt env=${anyhuntEnvFile}`);
  console.log(
    `[reset-rewrite] options=${[
      options.skipDatabases ? 'skip-databases' : null,
      options.skipRedis ? 'skip-redis' : null,
      options.skipR2 ? 'skip-r2' : null,
      options.includeMoryflowSitesBucket
        ? 'include-moryflow-sites-bucket'
        : null,
    ]
      .filter(Boolean)
      .join(', ') || 'default'}`
  );

  if (operations.length === 0) {
    console.log('[reset-rewrite] no operations selected');
    return;
  }

  console.log('[reset-rewrite] planned operations:');
  operations.forEach((operation, index) => {
    console.log(
      `  ${index + 1}. ${operation.kind} :: ${operation.label} :: ${operation.summary}`
    );
  });

  console.log('[reset-rewrite] deploy handoff commands:');
  console.log(
    '  1. pnpm --filter @moryflow/server exec prisma migrate deploy --config prisma.config.ts'
  );
  console.log(
    '  2. pnpm --filter @anyhunt/anyhunt-server exec prisma migrate deploy --config prisma.main.config.ts'
  );
  console.log(
    '  3. pnpm --filter @anyhunt/anyhunt-server exec prisma migrate deploy --config prisma.vector.config.ts'
  );
}

async function run() {
  const { values } = parseArgs({
    options: {
      execute: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
      'moryflow-env': { type: 'string' },
      'anyhunt-env': { type: 'string' },
      'skip-databases': { type: 'boolean', default: false },
      'skip-redis': { type: 'boolean', default: false },
      'skip-r2': { type: 'boolean', default: false },
      'include-moryflow-sites-bucket': {
        type: 'boolean',
        default: false,
      },
    },
    allowPositionals: false,
  });

  if (values.help) {
    printHelp();
    return;
  }

  const options = {
    execute: values.execute,
    skipDatabases: values['skip-databases'],
    skipRedis: values['skip-redis'],
    skipR2: values['skip-r2'],
    includeMoryflowSitesBucket: values['include-moryflow-sites-bucket'],
  };
  const moryflowEnvFile = values['moryflow-env'] || DEFAULT_MORYFLOW_ENV_FILE;
  const anyhuntEnvFile = values['anyhunt-env'] || DEFAULT_ANYHUNT_ENV_FILE;
  const moryflowEnv = loadEnvFile(moryflowEnvFile);
  const anyhuntEnv = loadEnvFile(anyhuntEnvFile);
  const operations = buildOperations(options, moryflowEnv, anyhuntEnv);

  printPlan(options, moryflowEnvFile, anyhuntEnvFile, operations);

  if (!options.execute) {
    console.log(
      '[reset-rewrite] dry-run only. Re-run with --execute to perform destructive cleanup.'
    );
    return;
  }

  for (const operation of operations) {
    console.log(`[reset-rewrite] executing ${operation.kind} :: ${operation.label}`);
    const result = await operation.execute();
    if (typeof result === 'string' && result.length > 0) {
      console.log(`[reset-rewrite] completed ${operation.label} :: ${result}`);
    } else {
      console.log(`[reset-rewrite] completed ${operation.label}`);
    }
  }

  console.log('[reset-rewrite] reset and cleanup completed');
  console.log('[reset-rewrite] deployment remains user-owned; run handoff migrate commands during deploy.');
}

run().catch((error) => {
  console.error('[reset-rewrite] failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
