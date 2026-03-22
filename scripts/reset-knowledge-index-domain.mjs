#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { parseArgs, parseEnv as parseNodeEnv } from 'node:util';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, '..');
const DEFAULT_ANYHUNT_ENV_FILE =
  process.env.ANYHUNT_KNOWLEDGE_RESET_ENV_FILE?.trim() ||
  path.join(ROOT_DIR, 'apps/anyhunt/server/.env');
const anyhuntServerRequire = createRequire(path.join(ROOT_DIR, 'apps/anyhunt/server/package.json'));

const DERIVED_TABLES = [
  'GraphObservation',
  'GraphRelation',
  'GraphEntity',
  'GraphProjectionRun',
  'MemoryFactHistory',
  'MemoryFactFeedback',
  'MemoryFactExport',
  'MemoryFact',
  'SourceChunk',
  'KnowledgeSourceRevision',
  'KnowledgeSource',
  'GraphScope',
  'ScopeRegistry',
];

const KNOWLEDGE_IDEMPOTENCY_SCOPE_PREFIXES = [
  'internal:memox:source-identities:resolve:',
  'internal:memox:sources:revisions:create:',
  'internal:memox:sources:revisions:finalize:',
  'internal:memox:sources:delete:',
  'memox:source-identities:resolve:',
  'memox:sources:create:',
  'memox:sources:delete:',
  'memox:sources:revisions:create:',
  'memox:sources:revisions:finalize:',
  'memox:sources:revisions:reindex:',
];

const R2_KEY_QUERIES = [
  {
    label: 'KnowledgeSourceRevision.normalizedTextR2Key',
    sql: 'SELECT "normalizedTextR2Key" AS key FROM "KnowledgeSourceRevision" WHERE "normalizedTextR2Key" IS NOT NULL',
  },
  {
    label: 'KnowledgeSourceRevision.blobR2Key',
    sql: 'SELECT "blobR2Key" AS key FROM "KnowledgeSourceRevision" WHERE "blobR2Key" IS NOT NULL',
  },
  {
    label: 'MemoryFactExport.r2Key',
    sql: 'SELECT "r2Key" AS key FROM "MemoryFactExport" WHERE "r2Key" IS NOT NULL',
  },
];

function printHelp() {
  console.log(`Usage: node scripts/reset-knowledge-index-domain.mjs [options]

Reset Anyhunt knowledge indexing derived state, including vector tables, derived R2 objects,
and knowledge-write idempotency records in the main database.
Default mode is dry-run. Nothing destructive happens unless --execute is passed.

Options:
  --execute                  Execute the reset
  --anyhunt-env <path>       Anyhunt server env file
  --skip-db                  Skip vector database cleanup
  --skip-r2                  Skip Anyhunt R2 derived object cleanup
  -h, --help                 Show this help
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

function maskToken(value, visiblePrefix = 3, visibleSuffix = 2) {
  const normalized = trimEnv(value);
  if (!normalized) {
    return '<missing>';
  }

  if (normalized.length <= visiblePrefix + visibleSuffix) {
    return '*'.repeat(normalized.length);
  }

  return `${normalized.slice(0, visiblePrefix)}***${normalized.slice(-visibleSuffix)}`;
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

function buildPgClient(connectionString) {
  const { Client: PgClient } = loadPackageModule('pg');
  return new PgClient({ connectionString });
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

async function collectTableCounts(client) {
  const counts = [];

  for (const table of DERIVED_TABLES) {
    const result = await client.query(`SELECT COUNT(*)::bigint::text AS count FROM "${table}"`);
    counts.push({
      table,
      count: Number.parseInt(result.rows[0]?.count ?? '0', 10),
    });
  }

  return counts;
}

async function collectR2Keys(client) {
  const perQueryCounts = [];
  const keys = new Set();

  for (const query of R2_KEY_QUERIES) {
    const result = await client.query(query.sql);
    let count = 0;
    for (const row of result.rows) {
      const key = trimEnv(row.key);
      if (!key) {
        continue;
      }
      count += 1;
      keys.add(key);
    }
    perQueryCounts.push({
      label: query.label,
      count,
    });
  }

  return {
    keys: [...keys],
    perQueryCounts,
  };
}

async function deleteR2Objects(client, bucketName, keys) {
  if (keys.length === 0) {
    return 0;
  }

  const { DeleteObjectsCommand } = loadPackageModule('@aws-sdk/client-s3');
  let deletedCount = 0;

  for (let index = 0; index < keys.length; index += 1000) {
    const batch = keys.slice(index, index + 1000).map((key) => ({ Key: key }));
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

  return deletedCount;
}

async function truncateDerivedTables(client) {
  await client.query(
    `TRUNCATE TABLE ${DERIVED_TABLES.map((table) => `"${table}"`).join(
      ', '
    )} RESTART IDENTITY CASCADE`
  );
}

async function collectIdempotencyCounts(client) {
  const counts = [];

  for (const prefix of KNOWLEDGE_IDEMPOTENCY_SCOPE_PREFIXES) {
    const result = await client.query(
      'SELECT COUNT(*)::bigint::text AS count FROM "IdempotencyRecord" WHERE scope LIKE $1',
      [`${prefix}%`]
    );
    counts.push({
      prefix,
      count: Number.parseInt(result.rows[0]?.count ?? '0', 10),
    });
  }

  return counts;
}

async function deleteKnowledgeIdempotencyRecords(client) {
  const predicates = KNOWLEDGE_IDEMPOTENCY_SCOPE_PREFIXES.map(
    (_, index) => `scope LIKE $${index + 1}`
  );
  const result = await client.query(
    `DELETE FROM "IdempotencyRecord" WHERE ${predicates.join(' OR ')}`,
    KNOWLEDGE_IDEMPOTENCY_SCOPE_PREFIXES.map((prefix) => `${prefix}%`)
  );
  return Number(result.rowCount ?? 0);
}

function printPlan({
  execute,
  anyhuntEnvFile,
  mainDatabaseUrl,
  vectorDatabaseUrl,
  bucketSummary,
  tableCounts,
  r2KeySummary,
  idempotencyCounts,
}) {
  console.log(`[knowledge-index-reset] mode=${execute ? 'execute' : 'dry-run'}`);
  console.log(`[knowledge-index-reset] anyhunt env=${anyhuntEnvFile}`);
  console.log(`[knowledge-index-reset] main database=${maskConnectionString(mainDatabaseUrl)}`);
  console.log(`[knowledge-index-reset] vector database=${maskConnectionString(vectorDatabaseUrl)}`);
  console.log(`[knowledge-index-reset] anyhunt bucket=${bucketSummary}`);
  console.log('[knowledge-index-reset] database rows:');
  for (const entry of tableCounts) {
    console.log(`  - ${entry.table}: ${entry.count}`);
  }
  console.log('[knowledge-index-reset] derived R2 keys:');
  for (const entry of r2KeySummary.perQueryCounts) {
    console.log(`  - ${entry.label}: ${entry.count}`);
  }
  console.log(`  - unique derived objects: ${r2KeySummary.keys.length}`);
  console.log('[knowledge-index-reset] knowledge-write idempotency records:');
  for (const entry of idempotencyCounts) {
    console.log(`  - ${entry.prefix}: ${entry.count}`);
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      execute: {
        type: 'boolean',
        default: false,
      },
      'anyhunt-env': {
        type: 'string',
      },
      'skip-db': {
        type: 'boolean',
        default: false,
      },
      'skip-r2': {
        type: 'boolean',
        default: false,
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

  const anyhuntEnvFile = path.resolve(values['anyhunt-env'] ?? DEFAULT_ANYHUNT_ENV_FILE);
  const anyhuntEnv = loadEnvFile(anyhuntEnvFile);

  ensureRequiredKeys('Anyhunt main database', anyhuntEnv, ['DATABASE_URL']);
  ensureRequiredKeys('Anyhunt vector database', anyhuntEnv, ['VECTOR_DATABASE_URL']);
  if (!values['skip-r2']) {
    ensureRequiredKeys('Anyhunt R2', anyhuntEnv, [
      'R2_ACCOUNT_ID',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'R2_BUCKET_NAME',
    ]);
  }

  const vectorClient = buildPgClient(anyhuntEnv.VECTOR_DATABASE_URL);
  const mainClient = buildPgClient(anyhuntEnv.DATABASE_URL);
  await Promise.all([vectorClient.connect(), mainClient.connect()]);

  try {
    const [tableCounts, r2KeySummary, idempotencyCounts] = await Promise.all([
      collectTableCounts(vectorClient),
      collectR2Keys(vectorClient),
      collectIdempotencyCounts(mainClient),
    ]);

    printPlan({
      execute: values.execute,
      anyhuntEnvFile,
      mainDatabaseUrl: anyhuntEnv.DATABASE_URL,
      vectorDatabaseUrl: anyhuntEnv.VECTOR_DATABASE_URL,
      bucketSummary: values['skip-r2']
        ? '<skipped>'
        : summarizeBucket(anyhuntEnv.R2_BUCKET_NAME, anyhuntEnv.R2_ACCOUNT_ID),
      tableCounts,
      r2KeySummary,
      idempotencyCounts,
    });

    if (!values.execute) {
      console.log(
        '[knowledge-index-reset] dry-run only. Re-run with --execute to delete derived knowledge/memory/vector/graph state.'
      );
      return;
    }

    if (!values['skip-r2']) {
      const r2Client = buildR2Client(anyhuntEnv);
      const deletedCount = await deleteR2Objects(
        r2Client,
        anyhuntEnv.R2_BUCKET_NAME,
        r2KeySummary.keys
      );
      console.log(`[knowledge-index-reset] deleted ${deletedCount} derived R2 object(s)`);
    } else {
      console.log('[knowledge-index-reset] skipped R2 cleanup');
    }

    if (!values['skip-db']) {
      await truncateDerivedTables(vectorClient);
      console.log(
        `[knowledge-index-reset] truncated ${DERIVED_TABLES.length} derived vector tables`
      );
    } else {
      console.log('[knowledge-index-reset] skipped vector database cleanup');
    }

    const deletedIdempotencyCount = await deleteKnowledgeIdempotencyRecords(mainClient);
    console.log(
      `[knowledge-index-reset] deleted ${deletedIdempotencyCount} knowledge-write idempotency record(s)`
    );

    console.log('[knowledge-index-reset] completed');
  } finally {
    await Promise.all([vectorClient.end(), mainClient.end()]);
  }
}

main().catch((error) => {
  console.error('[knowledge-index-reset] failed');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
