import { describe, expect, it, vi } from 'vitest';
import { SourceStatusesController } from '../source-statuses.controller';
import type { SourceIngestReadService } from '../source-ingest-read.service';
import type { ApiKeyValidationResult } from '../../api-key/api-key.types';

describe('SourceStatusesController', () => {
  const createController = (overrides?: {
    readService?: Partial<SourceIngestReadService>;
  }) => {
    const readService = {
      listStatuses: vi.fn(),
      ...(overrides?.readService ?? {}),
    } as unknown as SourceIngestReadService;

    return {
      controller: new SourceStatusesController(readService),
      readService,
    };
  };

  const apiKey = {
    id: 'api-key-1',
  } as ApiKeyValidationResult;

  it('delegates scoped source status reads and returns snake_case payloads', async () => {
    const { controller, readService } = createController({
      readService: {
        listStatuses: vi.fn().mockResolvedValue([
          {
            documentId: 'document-1',
            title: 'Doc',
            path: 'notes/doc.md',
            state: 'NEEDS_ATTENTION',
            userFacingReason: 'This file has no searchable text.',
            lastAttemptAt: '2026-03-11T07:00:00.000Z',
          },
        ]),
      },
    });

    await expect(
      controller.list(apiKey, {
        user_id: 'user-1',
        project_id: 'project-1',
        filter: 'attention',
      }),
    ).resolves.toEqual({
      items: [
        {
          document_id: 'document-1',
          title: 'Doc',
          path: 'notes/doc.md',
          state: 'NEEDS_ATTENTION',
          user_facing_reason: 'This file has no searchable text.',
          last_attempt_at: '2026-03-11T07:00:00.000Z',
        },
      ],
    });

    expect(readService.listStatuses).toHaveBeenCalledWith(
      'api-key-1',
      {
        user_id: 'user-1',
        project_id: 'project-1',
      },
      'attention',
    );
  });
});
