/**
 * [INPUT]: Anyhunt base URL + ANYHUNT_API_KEY
 * [OUTPUT]: OpenAPI contract review + source/retrieval/export load report JSON
 * [POS]: Memox 二期 Step 7 本地 OpenAPI/压测执行脚本
 */

import {
  FORBIDDEN_PATHS,
  REQUIRED_OPENAPI_OPERATIONS,
  REQUIRED_PATHS,
  assertExpectedStatus,
  assertExportCreatePayload,
  assertExportPayload,
  assertRetrievalSearchPayload,
  assertSourceSearchPayload,
  reviewOpenApiContract,
} from './memox-phase2-openapi-load-check.utils';

const ANYHUNT_BASE_URL =
  process.env.ANYHUNT_BASE_URL?.trim() || 'http://127.0.0.1:3100/api/v1';
const OPENAPI_URL =
  process.env.ANYHUNT_OPENAPI_URL?.trim() ||
  'http://127.0.0.1:3100/openapi.json';
const API_KEY = process.env.ANYHUNT_API_KEY?.trim();
const LOAD_USER_ID =
  process.env.ANYHUNT_PHASE2_LOAD_USER_ID?.trim() || 'memox-phase2-load-user';
const LOAD_PROJECT_ID =
  process.env.ANYHUNT_PHASE2_LOAD_PROJECT_ID?.trim() ||
  'memox-phase2-load-project';
const SOURCE_CASES = Number(process.env.ANYHUNT_PHASE2_SOURCE_CASES || '6');
const SOURCE_CONCURRENCY = Number(
  process.env.ANYHUNT_PHASE2_SOURCE_CONCURRENCY || '3',
);
const EXPORT_CASES = Number(process.env.ANYHUNT_PHASE2_EXPORT_CASES || '3');

interface TimedJsonResponse<T> {
  status: number;
  payload: T;
  durationMs: number;
}

function now(): number {
  return performance.now();
}

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * ratio) - 1),
  );
  return Math.round(sorted[index] * 100) / 100;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJson(response: Response): Promise<unknown> {
  const raw = await response.text();
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error(
      `Invalid JSON response (${response.status}): ${raw.slice(0, 500)}`,
    );
  }
}

async function anyhuntJson<T = unknown>(
  path: string,
  options: RequestInit,
): Promise<TimedJsonResponse<T>> {
  const startedAt = now();
  const response = await fetch(`${ANYHUNT_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const payload = (await readJson(response)) as T;
  const durationMs = Math.round((now() - startedAt) * 100) / 100;
  if (!response.ok) {
    throw new Error(
      `Anyhunt ${options.method || 'GET'} ${path} failed: ${response.status} ${JSON.stringify(payload)}`,
    );
  }
  return { status: response.status, payload, durationMs };
}

async function waitForExport(
  memoryExportId: string,
): Promise<TimedJsonResponse<{ results: unknown[] }>> {
  const startedAt = now();

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const response = await fetch(`${ANYHUNT_BASE_URL}/exports/get`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ memory_export_id: memoryExportId }),
    });
    const payload = await readJson(response);

    if (response.status === 404) {
      await sleep(250);
      continue;
    }

    assertExpectedStatus('exports.get', response.status, 200);
    const parsedPayload = assertExportPayload(payload);
    return {
      status: response.status,
      payload: parsedPayload,
      durationMs: Math.round((now() - startedAt) * 100) / 100,
    };
  }

  throw new Error(`export ${memoryExportId} did not complete in time`);
}

async function runSourceCase(index: number) {
  const externalId = `phase2-load-${index}-${Date.now()}`;
  const searchToken = `phase2loadtoken${index}`;
  const identity = await anyhuntJson<{ source_id: string }>(
    `/source-identities/note_markdown/${externalId}`,
    {
      method: 'PUT',
      headers: {
        'Idempotency-Key': `phase2-load-source-identity-${index}`,
      },
      body: JSON.stringify({
        title: `Phase 2 Load ${index}`,
        user_id: LOAD_USER_ID,
        project_id: LOAD_PROJECT_ID,
        display_path: `load/phase2-${index}.md`,
        mime_type: 'text/markdown',
        metadata: {
          source_origin: 'memox_phase2_load_check',
        },
      }),
    },
  );
  assertExpectedStatus('source-identities.put', identity.status, 200);

  const revision = await anyhuntJson<{ id: string }>(
    `/sources/${identity.payload.source_id}/revisions`,
    {
      method: 'POST',
      headers: {
        'Idempotency-Key': `phase2-load-revision-${index}`,
      },
      body: JSON.stringify({
        mode: 'inline_text',
        content: `phase 2 load test ${index} ${searchToken} sources finalize retrieval`,
      }),
    },
  );
  assertExpectedStatus('sources.revisions.create', revision.status, 200);

  const finalize = await anyhuntJson<Record<string, unknown>>(
    `/source-revisions/${revision.payload.id}/finalize`,
    {
      method: 'POST',
      headers: {
        'Idempotency-Key': `phase2-load-finalize-${index}`,
      },
    },
  );
  assertExpectedStatus('source-revisions.finalize', finalize.status, 200);

  const sourceSearch = await anyhuntJson('/sources/search', {
    method: 'POST',
    body: JSON.stringify({
      query: searchToken,
      top_k: 5,
      user_id: LOAD_USER_ID,
      project_id: LOAD_PROJECT_ID,
    }),
  });
  assertExpectedStatus('sources.search', sourceSearch.status, 200);
  const sourceSearchPayload = assertSourceSearchPayload(
    sourceSearch.payload,
    externalId,
  );

  const retrievalSearch = await anyhuntJson('/retrieval/search', {
    method: 'POST',
    body: JSON.stringify({
      query: searchToken,
      top_k: 5,
      include_sources: true,
      include_memory_facts: false,
      user_id: LOAD_USER_ID,
      project_id: LOAD_PROJECT_ID,
    }),
  });
  assertExpectedStatus('retrieval.search', retrievalSearch.status, 200);
  const retrievalSearchPayload = assertRetrievalSearchPayload(
    retrievalSearch.payload,
    externalId,
  );

  return {
    externalId,
    sourceId: identity.payload.source_id,
    revisionId: revision.payload.id,
    sourceSearchTotal: sourceSearchPayload.total,
    retrievalTotal: retrievalSearchPayload.total,
    statusCodes: {
      identity: identity.status,
      revision: revision.status,
      finalize: finalize.status,
      sourceSearch: sourceSearch.status,
      retrievalSearch: retrievalSearch.status,
    },
    durationsMs: {
      identity: identity.durationMs,
      revision: revision.durationMs,
      finalize: finalize.durationMs,
      sourceSearch: sourceSearch.durationMs,
      retrievalSearch: retrievalSearch.durationMs,
    },
  };
}

async function runWithConcurrency<T>(
  total: number,
  concurrency: number,
  runner: (index: number) => Promise<T>,
): Promise<T[]> {
  const results: T[] = new Array(total);
  let cursor = 0;

  async function worker() {
    while (cursor < total) {
      const index = cursor;
      cursor += 1;
      results[index] = await runner(index + 1);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(total, Math.max(1, concurrency)) }, () =>
      worker(),
    ),
  );

  return results;
}

async function runExportCase(index: number) {
  const created = await anyhuntJson<{ memory_export_id: string }>('/exports', {
    method: 'POST',
    headers: {
      'Idempotency-Key': `phase2-load-export-${index}`,
    },
    body: JSON.stringify({
      filters: {
        user_id: LOAD_USER_ID,
      },
    }),
  });
  assertExpectedStatus('exports.create', created.status, 200);

  const createdPayload = assertExportCreatePayload(created.payload);
  if (!createdPayload.memory_export_id) {
    throw new Error(
      `exports.create case ${index} returned empty memory_export_id`,
    );
  }

  const fetched = await waitForExport(createdPayload.memory_export_id);

  return {
    memoryExportId: createdPayload.memory_export_id,
    createStatus: created.status,
    getStatus: fetched.status,
    createDurationMs: created.durationMs,
    timeToAvailableMs: fetched.durationMs,
    resultCount: fetched.payload.results.length,
  };
}

async function main(): Promise<void> {
  if (!API_KEY) {
    throw new Error('ANYHUNT_API_KEY is required');
  }

  const openapiResponse = await fetch(OPENAPI_URL);
  const openapi = (await readJson(openapiResponse)) as {
    paths?: Record<string, unknown>;
  };
  if (!openapiResponse.ok) {
    throw new Error(
      `OpenAPI fetch failed: ${openapiResponse.status} ${JSON.stringify(openapi)}`,
    );
  }
  assertExpectedStatus('openapi.fetch', openapiResponse.status, 200);

  const openapiReview = reviewOpenApiContract(openapi);
  if (
    openapiReview.missingPaths.length > 0 ||
    openapiReview.forbiddenPresent.length > 0 ||
    openapiReview.missingOperations.length > 0 ||
    openapiReview.invalidSuccessStatuses.length > 0 ||
    openapiReview.invalidResponseSchemas.length > 0
  ) {
    throw new Error(
      `OpenAPI contract mismatch: ${JSON.stringify(openapiReview)}`,
    );
  }

  const sourceCases = await runWithConcurrency(
    SOURCE_CASES,
    SOURCE_CONCURRENCY,
    runSourceCase,
  );
  const exportCases = [];
  for (let index = 1; index <= EXPORT_CASES; index += 1) {
    exportCases.push(await runExportCase(index));
  }

  console.log(
    JSON.stringify(
      {
        openapi: {
          status: openapiResponse.status,
          requiredPaths: REQUIRED_PATHS,
          forbiddenPaths: FORBIDDEN_PATHS,
          requiredOperations: REQUIRED_OPENAPI_OPERATIONS,
          ...openapiReview,
        },
        sourceLoad: {
          cases: sourceCases,
          p95Ms: {
            identity: percentile(
              sourceCases.map((item) => item.durationsMs.identity),
              0.95,
            ),
            revision: percentile(
              sourceCases.map((item) => item.durationsMs.revision),
              0.95,
            ),
            finalize: percentile(
              sourceCases.map((item) => item.durationsMs.finalize),
              0.95,
            ),
            sourceSearch: percentile(
              sourceCases.map((item) => item.durationsMs.sourceSearch),
              0.95,
            ),
            retrievalSearch: percentile(
              sourceCases.map((item) => item.durationsMs.retrievalSearch),
              0.95,
            ),
          },
        },
        exportLoad: {
          cases: exportCases,
          p95Ms: {
            create: percentile(
              exportCases.map((item) => item.createDurationMs),
              0.95,
            ),
            timeToAvailable: percentile(
              exportCases.map((item) => item.timeToAvailableMs),
              0.95,
            ),
          },
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
