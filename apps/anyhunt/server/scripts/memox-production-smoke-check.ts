/**
 * [INPUT]: Anyhunt production API base URL + API key
 * [OUTPUT]: Source identity / revision / finalize / search / delete smoke report
 * [POS]: Memox 线上 source 生命周期自动化验收脚本
 */

import {
  buildMemoxValidationCase,
  buildWriteHeaders,
  createMemoxValidationRunId,
  findSourceHit,
  parseJsonResponse,
} from './memox-production-smoke-check.utils';
import { SearchSourcesResponseSchema } from '../src/retrieval/dto/retrieval.schema';

const ANYHUNT_API_BASE_URL =
  process.env.ANYHUNT_API_BASE_URL?.trim() || 'http://127.0.0.1:3100';
const ANYHUNT_BASE_URL =
  process.env.ANYHUNT_BASE_URL?.trim() ||
  `${ANYHUNT_API_BASE_URL.replace(/\/$/, '')}/api/v1`;
const ANYHUNT_API_KEY = process.env.ANYHUNT_API_KEY?.trim();

function requireEnv(key: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`${key} is required`);
  }
  return trimmed;
}

async function requestJson(
  path: string,
  options: RequestInit,
): Promise<{ status: number; payload: unknown }> {
  const response = await fetch(`${ANYHUNT_BASE_URL}${path}`, options);
  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(
      `Anyhunt ${options.method || 'GET'} ${path} failed: ${response.status} ${JSON.stringify(payload)}`,
    );
  }
  return { status: response.status, payload };
}

async function poll<T>(
  task: () => Promise<T>,
  predicate: (value: T) => boolean,
  message: string,
): Promise<T> {
  let lastValue: T | undefined;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    lastValue = await task();
    if (predicate(lastValue)) {
      return lastValue;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(
    message + (lastValue ? `: ${JSON.stringify(lastValue)}` : ''),
  );
}

async function searchSource(
  apiKey: string,
  validationCase: MemoxValidationCase,
): Promise<unknown> {
  const response = await requestJson('/sources/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: validationCase.query,
      top_k: 5,
      source_types: ['note_markdown'],
      project_id: validationCase.projectId,
    }),
  });
  return response.payload;
}

type MemoxValidationCase = ReturnType<typeof buildMemoxValidationCase>;

async function main() {
  const apiKey = requireEnv('ANYHUNT_API_KEY', ANYHUNT_API_KEY);
  const validationCase = buildMemoxValidationCase(createMemoxValidationRunId());
  let sourceId: string | null = null;
  let revisionId: string | null = null;
  let sourceDeleted = false;

  try {
    const identity = await requestJson(
      `/source-identities/note_markdown/${encodeURIComponent(validationCase.externalId)}`,
      {
        method: 'PUT',
        headers: buildWriteHeaders(
          apiKey,
          `memox-production-identity-${validationCase.runId}`,
        ),
        body: JSON.stringify({
          title: validationCase.title,
          display_path: `codex-validation/${validationCase.title}`,
          project_id: validationCase.projectId,
          mime_type: 'text/markdown',
          metadata: {
            source: 'codex-validation',
            validation_type: 'memox-production-smoke',
            validation_run_id: validationCase.runId,
          },
        }),
      },
    );

    sourceId = (identity.payload as { source_id?: string }).source_id ?? null;
    if (!sourceId) {
      throw new Error('source identity response missing source_id');
    }

    const revision = await requestJson(`/sources/${sourceId}/revisions`, {
      method: 'POST',
      headers: buildWriteHeaders(
        apiKey,
        `memox-production-revision-${validationCase.runId}`,
      ),
      body: JSON.stringify({
        mode: 'inline_text',
        mime_type: 'text/markdown',
        content: `# Codex Validation\n\nQuery token: ${validationCase.query}\n`,
      }),
    });

    revisionId = (revision.payload as { id?: string }).id ?? null;
    if (!revisionId) {
      throw new Error('source revision response missing id');
    }

    await requestJson(`/source-revisions/${revisionId}/finalize`, {
      method: 'POST',
      headers: buildWriteHeaders(
        apiKey,
        `memox-production-finalize-${validationCase.runId}`,
      ),
      body: JSON.stringify({}),
    });

    const searchPayload = await poll(
      () => searchSource(apiKey, validationCase),
      (payload) => {
        try {
          findSourceHit(payload, validationCase.externalId);
          return true;
        } catch {
          return false;
        }
      },
      `sources.search did not hit ${validationCase.externalId}`,
    );
    findSourceHit(searchPayload, validationCase.externalId);

    await requestJson(`/sources/${sourceId}`, {
      method: 'DELETE',
      headers: buildWriteHeaders(
        apiKey,
        `memox-production-delete-${validationCase.runId}`,
      ),
    });
    sourceDeleted = true;

    await poll(
      () => searchSource(apiKey, validationCase),
      (payload) =>
        !SearchSourcesResponseSchema.parse(payload).results.some(
          (item) => item.external_id === validationCase.externalId,
        ),
      `sources.search still hits deleted source ${sourceId}`,
    );

    console.log(
      JSON.stringify(
        {
          ok: true,
          sourceId,
          revisionId,
          externalId: validationCase.externalId,
          query: validationCase.query,
        },
        null,
        2,
      ),
    );
  } finally {
    if (sourceId && !sourceDeleted) {
      try {
        await requestJson(`/sources/${sourceId}`, {
          method: 'DELETE',
          headers: buildWriteHeaders(
            apiKey,
            `memox-production-cleanup-${validationCase.runId}`,
          ),
        });
      } catch (cleanupError) {
        console.warn(
          `[memox-production-smoke] cleanup failed for source ${sourceId}:`,
          cleanupError,
        );
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
