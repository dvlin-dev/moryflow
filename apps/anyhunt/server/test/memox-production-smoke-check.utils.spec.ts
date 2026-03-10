import { describe, expect, it } from 'vitest';

import {
  buildMemoxValidationCase,
  buildWriteHeaders,
  createMemoxValidationRunId,
  findSourceHit,
  parseJsonResponse,
} from '../scripts/memox-production-smoke-check.utils';

describe('memox production smoke check utils', () => {
  it('builds deterministic validation run ids with millisecond precision and entropy', () => {
    expect(
      createMemoxValidationRunId(
        new Date('2026-03-10T12:00:00.123Z'),
        'AbCd1234',
      ),
    ).toBe('20260310120000123-abcd1234');
  });

  it('builds deterministic validation identifiers from run id', () => {
    const validationCase = buildMemoxValidationCase(
      '20260310120000123-abcd1234',
    );

    expect(validationCase.externalId).toBe(
      'codex-validation-memox-20260310120000123-abcd1234',
    );
    expect(validationCase.query).toContain('20260310120000123-abcd1234');
    expect(validationCase.projectId).toBe('codex-validation');
    expect(validationCase.title).toBe(
      'codex-validation-note-20260310120000123-abcd1234.md',
    );
  });

  it('creates bearer and idempotency headers for write calls', () => {
    expect(buildWriteHeaders('ah_test', 'idem-1')).toEqual({
      Authorization: 'Bearer ah_test',
      'Content-Type': 'application/json',
      'Idempotency-Key': 'idem-1',
    });
  });

  it('finds expected hit by external id', () => {
    const hit = findSourceHit(
      {
        results: [
          {
            result_kind: 'source',
            id: 'result-1',
            score: 0.9,
            rank: 1,
            source_id: 'source-1',
            source_type: 'note_markdown',
            project_id: 'codex-validation',
            external_id: 'codex-validation-memox-1',
            display_path: 'codex-validation/doc.md',
            title: 'Doc',
            snippet: 'hello',
            matched_chunks: [],
            metadata: {},
          },
        ],
        total: 1,
      },
      'codex-validation-memox-1',
    );

    expect(hit).toEqual(
      expect.objectContaining({
        external_id: 'codex-validation-memox-1',
      }),
    );
  });

  it('throws when expected hit is missing', () => {
    expect(() =>
      findSourceHit(
        {
          results: [
            {
              result_kind: 'source',
              id: 'result-1',
              score: 0.9,
              rank: 1,
              source_id: 'source-1',
              source_type: 'note_markdown',
              project_id: 'codex-validation',
              external_id: 'other-id',
              display_path: 'codex-validation/doc.md',
              title: 'Doc',
              snippet: 'hello',
              matched_chunks: [],
              metadata: {},
            },
          ],
          total: 1,
        },
        'missing-id',
      ),
    ).toThrow('sources.search miss for missing-id');
  });

  it('parses valid JSON responses', async () => {
    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    await expect(parseJsonResponse(response)).resolves.toEqual({ ok: true });
  });

  it('throws on invalid JSON responses', async () => {
    const response = new Response('<html>bad gateway</html>', {
      status: 502,
      headers: {
        'Content-Type': 'text/html',
      },
    });

    await expect(parseJsonResponse(response)).rejects.toThrow(
      /Invalid JSON response \(502\)/,
    );
  });
});
