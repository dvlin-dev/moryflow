import { randomUUID } from 'node:crypto';

import { SearchSourcesResponseSchema } from '../src/retrieval/dto/retrieval.schema';

export interface MemoxValidationCase {
  runId: string;
  externalId: string;
  query: string;
  title: string;
  projectId: string;
}

export function createMemoxValidationRunId(
  now = new Date(),
  entropy = randomUUID().slice(0, 8),
): string {
  const timestamp = now.toISOString().replace(/\D/g, '').slice(0, 17);
  return `${timestamp}-${entropy.toLowerCase()}`;
}

export function buildMemoxValidationCase(runId: string): MemoxValidationCase {
  return {
    runId,
    externalId: `codex-validation-memox-${runId}`,
    query: `codex validation ${runId}`,
    title: `codex-validation-note-${runId}.md`,
    projectId: 'codex-validation',
  };
}

export function buildWriteHeaders(
  apiKey: string,
  idempotencyKey: string,
): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Idempotency-Key': idempotencyKey,
  };
}

export async function parseJsonResponse(response: Response): Promise<unknown> {
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

export function findSourceHit(payload: unknown, externalId: string) {
  const parsed = SearchSourcesResponseSchema.parse(payload);
  const hit = parsed.results.find((item) => item.external_id === externalId);
  if (!hit) {
    throw new Error(`sources.search miss for ${externalId}`);
  }
  return hit;
}
